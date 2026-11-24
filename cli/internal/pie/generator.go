package pie

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

// GenerateOptions configures OpenAPI to TypeScript client generation.
type GenerateOptions struct {
	Spec           string
	OutTS          string
	Root           string
	Prefix         string
	DefaultBaseURL string
}

var (
	identRegex    = regexp.MustCompile(`^[a-zA-Z_$][a-zA-Z0-9_$]*$`)
	nonIdentRegex = regexp.MustCompile(`[^a-zA-Z0-9_$]`)
	httpMethods   = []string{"get", "post", "put", "delete", "patch", "head", "options"}
	successCodes  = []string{"200", "201", "202", "203", "204", "default"}
	errorCodes    = []string{"400", "401", "403", "404", "422", "500", "default"}
	tsReserved    = map[string]bool{
		"break": true, "case": true, "catch": true, "class": true, "const": true,
		"continue": true, "debugger": true, "default": true, "delete": true, "do": true,
		"else": true, "enum": true, "export": true, "extends": true, "false": true,
		"finally": true, "for": true, "function": true, "if": true, "import": true,
		"in": true, "instanceof": true, "new": true, "null": true, "return": true,
		"super": true, "switch": true, "this": true, "throw": true, "true": true,
		"try": true, "typeof": true, "var": true, "void": true, "while": true,
		"with": true, "yield": true, "let": true, "static": true, "implements": true,
		"interface": true, "package": true, "private": true, "protected": true, "public": true,
		"any": true, "boolean": true, "number": true, "string": true, "symbol": true,
		"type": true, "from": true, "of": true,
	}
	commentSanitizer = strings.NewReplacer("\r", " ", "\n", " ", "\u2028", " ", "\u2029", " ")
)

const maxSpecBytes = 50 * 1024 * 1024

func sanitizeTSIdentifier(raw string) string {
	if identRegex.MatchString(raw) && !tsReserved[raw] {
		return raw
	}
	return "_" + nonIdentRegex.ReplaceAllString(raw, "_")
}

type paramMeta struct {
	tsType   string
	required bool
}

type operationNode struct {
	method       string
	operationID  string
	summary      string
	queryParams  map[string]paramMeta
	pathParams   map[string]paramMeta
	bodyType     string
	responseType string
	errorType    string
}

type dynamicChild struct {
	paramName string
	node      *treeNode
}

type treeNode struct {
	staticChildren map[string]*treeNode
	dynamicChild   *dynamicChild
	operations     []operationNode
}

func newTreeNode() *treeNode {
	return &treeNode{
		staticChildren: make(map[string]*treeNode),
	}
}

func fetchOrReadSpec(specStr string, root string) (map[string]any, error) {
	trimmed := strings.TrimSpace(specStr)
	if trimmed == "" {
		return nil, fmt.Errorf("spec path or URL is required")
	}

	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
		client := &http.Client{Timeout: 30 * time.Second}
		req, err := http.NewRequest(http.MethodGet, trimmed, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to build request for %s: %w", trimmed, err)
		}
		req.Header.Set("Accept", "application/json, text/yaml, text/plain, */*")

		resp, err := client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch OpenAPI spec from %s: %w", trimmed, err)
		}
		defer resp.Body.Close()

		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return nil, fmt.Errorf("failed to fetch OpenAPI spec from %s: %d %s", trimmed, resp.StatusCode, resp.Status)
		}

		body, err := io.ReadAll(io.LimitReader(resp.Body, maxSpecBytes+1))
		if err != nil {
			return nil, fmt.Errorf("failed to read OpenAPI spec from %s: %w", trimmed, err)
		}
		if len(body) > maxSpecBytes {
			return nil, fmt.Errorf("OpenAPI spec from %s exceeds maximum size of %d bytes", trimmed, maxSpecBytes)
		}
		return ParseYAMLOrJSON(string(body))
	}

	fileAbs := trimmed
	if !filepath.IsAbs(trimmed) {
		fileAbs = filepath.Join(root, trimmed)
	}
	content, err := os.ReadFile(fileAbs)
	if err != nil {
		return nil, fmt.Errorf("failed to read OpenAPI spec %s: %w", fileAbs, err)
	}
	return ParseYAMLOrJSON(string(content))
}

func resolveRefName(ref string) string {
	if ref == "" {
		return "any"
	}
	parts := strings.Split(ref, "/")
	last := parts[len(parts)-1]
	if last == "" {
		return "any"
	}
	return sanitizeTSIdentifier(last)
}

func asMap(v any) map[string]any {
	if m, ok := v.(map[string]any); ok {
		return m
	}
	return nil
}

func asSlice(v any) []any {
	if s, ok := v.([]any); ok {
		return s
	}
	return nil
}

func asString(v any) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return fmt.Sprint(v)
}

func asBool(v any) bool {
	if b, ok := v.(bool); ok {
		return b
	}
	return false
}

func jsonMarshalString(v any) string {
	b, err := json.Marshal(v)
	if err != nil {
		return `""`
	}
	return string(b)
}

func sortedKeys[V any](m map[string]V) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func schemaToTsType(raw any) string {
	schema := asMap(raw)
	if schema == nil {
		return "any"
	}
	if ref := asString(schema["$ref"]); ref != "" {
		return resolveRefName(ref)
	}

	if list := asSlice(schema["oneOf"]); list != nil {
		return joinUnionTypes(list)
	}
	if list := asSlice(schema["anyOf"]); list != nil {
		return joinUnionTypes(list)
	}

	if enumList := asSlice(schema["enum"]); enumList != nil {
		parts := make([]string, 0, len(enumList))
		for _, item := range enumList {
			parts = append(parts, jsonMarshalString(item))
		}
		if len(parts) > 0 {
			return strings.Join(parts, " | ")
		}
	}

	schemaType := asString(schema["type"])
	switch schemaType {
	case "string":
		if asString(schema["format"]) == "binary" {
			return "Blob | File"
		}
		return "string"
	case "number", "integer":
		return "number"
	case "boolean":
		return "boolean"
	case "null":
		return "null"
	case "array":
		itemsType := "any"
		if items, ok := schema["items"]; ok && items != nil {
			itemsType = schemaToTsType(items)
		}
		if strings.Contains(itemsType, " ") || strings.Contains(itemsType, "|") {
			return "(" + itemsType + ")[]"
		}
		return itemsType + "[]"
	}

	_, hasProps := schema["properties"]
	addProps, hasAddProps := schema["additionalProperties"]
	if schemaType == "object" || hasProps || (hasAddProps && addProps != nil && addProps != false) {
		props := asMap(schema["properties"])
		if props == nil && hasAddProps && addProps != nil && addProps != false {
			valType := "any"
			if addMap := asMap(addProps); addMap != nil {
				valType = schemaToTsType(addMap)
			}
			return fmt.Sprintf("Record<string, %s>", valType)
		}

		reqSet := make(map[string]bool)
		for _, r := range asSlice(schema["required"]) {
			if s := asString(r); s != "" {
				reqSet[s] = true
			}
		}

		var lines []string
		for _, propName := range sortedKeys(props) {
			propSchema := props[propName]
			isReq := reqSet[propName]
			tsType := schemaToTsType(propSchema)
			safeProp := propName
			if !identRegex.MatchString(propName) {
				safeProp = jsonMarshalString(propName)
			}
			optMark := "?"
			if isReq {
				optMark = ""
			}
			lines = append(lines, fmt.Sprintf("  %s%s: %s", safeProp, optMark, tsType))
		}

		if len(lines) == 0 {
			return "Record<string, any>"
		}
		return "{\n" + strings.Join(lines, "\n") + "\n}"
	}

	return "any"
}

func joinUnionTypes(list []any) string {
	if len(list) == 0 {
		return "any"
	}
	parts := make([]string, 0, len(list))
	for _, item := range list {
		parts = append(parts, schemaToTsType(item))
	}
	return strings.Join(parts, " | ")
}

func generateComponentSchemas(components map[string]any) string {
	if components == nil {
		return ""
	}
	schemas := asMap(components["schemas"])
	if len(schemas) == 0 {
		return ""
	}

	var lines []string
	for _, name := range sortedKeys(schemas) {
		safeName := sanitizeTSIdentifier(name)
		tsType := schemaToTsType(schemas[name])
		if strings.HasPrefix(tsType, "{\n") {
			lines = append(lines, fmt.Sprintf("export interface %s %s\n", safeName, tsType))
		} else {
			lines = append(lines, fmt.Sprintf("export type %s = %s\n", safeName, tsType))
		}
	}
	return strings.Join(lines, "\n")
}

func extractTypeFromContent(content map[string]any) string {
	if content == nil {
		return "any"
	}
	for _, mediaKey := range []string{"application/json", "application/*+json", "*/*"} {
		if media := asMap(content[mediaKey]); media != nil {
			if schema, ok := media["schema"]; ok && schema != nil {
				return schemaToTsType(schema)
			}
		}
	}
	if content["text/plain"] != nil || content["text/html"] != nil {
		return "string"
	}
	return "any"
}

func extractSuccessResponse(responses map[string]any) string {
	if responses == nil {
		return "any"
	}
	for _, code := range successCodes {
		if resp := asMap(responses[code]); resp != nil {
			if code == "204" {
				return "void"
			}
			return extractTypeFromContent(asMap(resp["content"]))
		}
	}
	return "any"
}

func extractErrorResponse(responses map[string]any) string {
	if responses == nil {
		return "unknown"
	}
	for _, code := range errorCodes {
		if resp := asMap(responses[code]); resp != nil {
			if content := asMap(resp["content"]); content != nil {
				return extractTypeFromContent(content)
			}
		}
	}
	return "unknown"
}

func buildRouteTree(spec map[string]any, prefixToStrip string) *treeNode {
	root := newTreeNode()
	paths := asMap(spec["paths"])
	if paths == nil {
		return root
	}

	normalizedPrefix := "/" + strings.Trim(prefixToStrip, "/")

	for _, rawPath := range sortedKeys(paths) {
		pathItem := asMap(paths[rawPath])
		if pathItem == nil {
			continue
		}

		cleanPath := rawPath
		if strings.HasPrefix(cleanPath, normalizedPrefix+"/") || cleanPath == normalizedPrefix {
			cleanPath = cleanPath[len(normalizedPrefix):]
		}
		if !strings.HasPrefix(cleanPath, "/") {
			cleanPath = "/" + cleanPath
		}

		current := root
		for _, seg := range strings.Split(cleanPath, "/") {
			if seg == "" {
				continue
			}
			if strings.HasPrefix(seg, "{") && strings.HasSuffix(seg, "}") && len(seg) > 2 {
				paramName := seg[1 : len(seg)-1]
				if current.dynamicChild == nil {
					current.dynamicChild = &dynamicChild{
						paramName: paramName,
						node:      newTreeNode(),
					}
				}
				current = current.dynamicChild.node
			} else {
				child, exists := current.staticChildren[seg]
				if !exists {
					child = newTreeNode()
					current.staticChildren[seg] = child
				}
				current = child
			}
		}

		pathParamsList := asSlice(pathItem["parameters"])
		for _, method := range httpMethods {
			op := asMap(pathItem[method])
			if op == nil {
				continue
			}

			queryParams := make(map[string]paramMeta)
			pathParams := make(map[string]paramMeta)

			allParams := make([]any, 0, len(pathParamsList)+len(asSlice(op["parameters"])))
			allParams = append(allParams, pathParamsList...)
			allParams = append(allParams, asSlice(op["parameters"])...)

			for _, rawParam := range allParams {
				p := asMap(rawParam)
				if p == nil {
					continue
				}
				in := asString(p["in"])
				name := asString(p["name"])
				if name == "" {
					continue
				}
				paramType := "string"
				if schema, ok := p["schema"]; ok && schema != nil {
					paramType = schemaToTsType(schema)
				}
				switch in {
				case "query":
					queryParams[name] = paramMeta{
						tsType:   paramType,
						required: asBool(p["required"]),
					}
				case "path":
					pathParams[name] = paramMeta{
						tsType:   paramType,
						required: true,
					}
				}
			}

			bodyType := ""
			if reqBody := asMap(op["requestBody"]); reqBody != nil {
				if content := asMap(reqBody["content"]); content != nil {
					bodyType = extractTypeFromContent(content)
				}
			}

			responses := asMap(op["responses"])
			responseType := extractSuccessResponse(responses)
			errorType := extractErrorResponse(responses)

			current.operations = append(current.operations, operationNode{
				method:       method,
				operationID:  asString(op["operationId"]),
				summary:      asString(op["summary"]),
				queryParams:  queryParams,
				pathParams:   pathParams,
				bodyType:     bodyType,
				responseType: responseType,
				errorType:    errorType,
			})
		}
	}

	return root
}

func renderTreeType(node *treeNode, indent int) string {
	spaces := strings.Repeat(" ", indent)
	var lines []string

	for _, name := range sortedKeys(node.staticChildren) {
		child := node.staticChildren[name]
		safeKey := name
		if !identRegex.MatchString(name) {
			safeKey = jsonMarshalString(name)
		}
		lines = append(lines, fmt.Sprintf("%s%s: %s", spaces, safeKey, renderTreeType(child, indent+2)))
	}

	if node.dynamicChild != nil {
		pName := node.dynamicChild.paramName
		safeParamIdent := sanitizeTSIdentifier(pName)
		safeParamKey := pName
		if !identRegex.MatchString(pName) {
			safeParamKey = jsonMarshalString(pName)
		}
		childRendered := renderTreeType(node.dynamicChild.node, indent+2)
		lines = append(lines, fmt.Sprintf("%s(%s: string | number | { %s: string | number }): %s", spaces, safeParamIdent, safeParamKey, childRendered))
	}

	for _, op := range node.operations {
		var optFields []string
		if op.bodyType != "" && op.bodyType != "void" {
			optFields = append(optFields, "body: "+op.bodyType)
		}
		if len(op.queryParams) > 0 {
			var qProps []string
			for _, k := range sortedKeys(op.queryParams) {
				v := op.queryParams[k]
				safeQKey := k
				if !identRegex.MatchString(k) {
					safeQKey = jsonMarshalString(k)
				}
				optMark := "?"
				if v.required {
					optMark = ""
				}
				qProps = append(qProps, fmt.Sprintf("%s%s: %s", safeQKey, optMark, v.tsType))
			}
			optFields = append(optFields, fmt.Sprintf("query?: { %s }", strings.Join(qProps, "; ")))
		}
		optFields = append(optFields, "headers?: Record<string, string>")
		optFields = append(optFields, "baseUrl?: string")
		optFields = append(optFields, "signal?: AbortSignal")

		optsType := fmt.Sprintf("{ %s }", strings.Join(optFields, "; "))
		resType := op.responseType
		if resType == "" {
			resType = "any"
		}
		errType := op.errorType
		if errType == "" {
			errType = "unknown"
		}
		returnType := fmt.Sprintf("Promise<PieResponse<%s, %s>>", resType, errType)
		lines = append(lines, fmt.Sprintf("%s%s: (options?: %s) => %s", spaces, op.method, optsType, returnType))
	}

	if len(lines) == 0 {
		return "{}"
	}
	closingIndent := 0
	if indent > 2 {
		closingIndent = indent - 2
	}
	return fmt.Sprintf("{\n%s\n%s}", strings.Join(lines, "\n"), strings.Repeat(" ", closingIndent))
}

// GenerateAPI generates a typed TypeScript route tree and schema interfaces from an OpenAPI specification.
func GenerateAPI(opts GenerateOptions) (string, error) {
	root := opts.Root
	if root == "" {
		wd, err := os.Getwd()
		if err != nil {
			return "", fmt.Errorf("failed to get working directory: %w", err)
		}
		root = wd
	}

	spec, err := fetchOrReadSpec(opts.Spec, root)
	if err != nil {
		return "", err
	}

	prefix := opts.Prefix
	if prefix == "" {
		prefix = "/api"
	}

	outTS := opts.OutTS
	if outTS == "" {
		outTS = filepath.Join(root, "core/api/generated.ts")
	} else if !filepath.IsAbs(outTS) {
		outTS = filepath.Join(root, outTS)
	}
	outTS, err = filepath.Abs(outTS)
	if err != nil {
		return "", fmt.Errorf("failed to resolve output path: %w", err)
	}

	info := asMap(spec["info"])
	title := "API"
	version := "1.0.0"
	if info != nil {
		if t := asString(info["title"]); t != "" {
			title = t
		}
		if v := asString(info["version"]); v != "" {
			version = v
		}
	}
	title = commentSanitizer.Replace(title)
	version = commentSanitizer.Replace(version)

	schemasTS := generateComponentSchemas(asMap(spec["components"]))
	treeRoot := buildRouteTree(spec, prefix)
	treeTS := renderTreeType(treeRoot, 2)

	code := fmt.Sprintf(`/* eslint-disable */
// AUTO-GENERATED BY @dex/pie. DO NOT EDIT.
// Title: %s
// Version: %s
// Generated at: %s

import { createPie, type PieOptions, type PieResponse } from '@dex/pie'

%s

/**
 * Navigable Route Tree Contract generated from OpenAPI.
 */
export type ApiRoutes = %s

/**
 * Preconfigured API client factory for this OpenAPI schema.
 */
export function createApiClient(options?: Partial<PieOptions>) {
  return createPie<ApiRoutes>({
    prefix: %s,
    baseUrl: %s,
    ...options,
  })
}
`, title, version, time.Now().UTC().Format(time.RFC3339), schemasTS, treeTS, jsonMarshalString(prefix), jsonMarshalString(opts.DefaultBaseURL))

	if err := os.MkdirAll(filepath.Dir(outTS), 0o755); err != nil {
		return "", fmt.Errorf("failed to create output directory: %w", err)
	}
	if err := os.WriteFile(outTS, []byte(code), 0o644); err != nil {
		return "", fmt.Errorf("failed to write generated TypeScript file: %w", err)
	}

	return outTS, nil
}
