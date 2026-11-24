package pie

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestGenerateAPI_JSON(t *testing.T) {
	tmpDir := t.TempDir()
	specPath := filepath.Join(tmpDir, "openapi.json")
	outPath := filepath.Join(tmpDir, "generated", "api.ts")

	jsonSpec := `{
  "openapi": "3.0.3",
  "info": {
    "title": "Users JSON API",
    "version": "2.1.0"
  },
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "required": ["id", "email"],
        "properties": {
          "id": { "type": "string" },
          "email": { "type": "string" },
          "role": { "type": "string", "enum": ["admin", "member"] }
        }
      },
      "CreateUserInput": {
        "type": "object",
        "required": ["email"],
        "properties": {
          "email": { "type": "string" }
        }
      },
      "ApiError": {
        "type": "object",
        "required": ["message"],
        "properties": {
          "message": { "type": "string" }
        }
      }
    }
  },
  "paths": {
    "/api/users": {
      "get": {
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "required": false,
            "schema": { "type": "integer" }
          },
          {
            "name": "search",
            "in": "query",
            "required": true,
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": { "$ref": "#/components/schemas/User" }
                }
              }
            }
          },
          "400": {
            "description": "Bad Request",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/ApiError" }
              }
            }
          }
        }
      },
      "post": {
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/CreateUserInput" }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Created",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/User" }
              }
            }
          },
          "400": {
            "description": "Bad Request",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/ApiError" }
              }
            }
          }
        }
      }
    },
    "/api/users/{id}": {
      "get": {
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/User" }
              }
            }
          },
          "404": {
            "description": "Not Found",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/ApiError" }
              }
            }
          }
        }
      }
    }
  }
}`

	if err := os.WriteFile(specPath, []byte(jsonSpec), 0o644); err != nil {
		t.Fatalf("failed to write json spec: %v", err)
	}

	gotOut, err := GenerateAPI(GenerateOptions{
		Spec:           "openapi.json",
		OutTS:          "generated/api.ts",
		Root:           tmpDir,
		Prefix:         "/api",
		DefaultBaseURL: "https://api.example.com",
	})
	if err != nil {
		t.Fatalf("GenerateAPI(json) failed: %v", err)
	}
	if gotOut != outPath {
		t.Fatalf("expected output path %q, got %q", outPath, gotOut)
	}

	contentBytes, err := os.ReadFile(gotOut)
	if err != nil {
		t.Fatalf("failed to read generated output: %v", err)
	}
	out := string(contentBytes)

	expectedSnippets := []string{
		"// Title: Users JSON API",
		"// Version: 2.1.0",
		"export interface User {",
		"id: string",
		"email: string",
		`role?: "admin" | "member"`,
		"export interface CreateUserInput {",
		"export interface ApiError {",
		"export type ApiRoutes = {",
		"users: {",
		"(id: string | number | { id: string | number }): {",
		"get: (options?: { headers?: Record<string, string>; baseUrl?: string; signal?: AbortSignal }) => Promise<PieResponse<User, ApiError>>",
		"get: (options?: { query?: { page?: number; search: string }; headers?: Record<string, string>; baseUrl?: string; signal?: AbortSignal }) => Promise<PieResponse<User[], ApiError>>",
		"post: (options?: { body: CreateUserInput; headers?: Record<string, string>; baseUrl?: string; signal?: AbortSignal }) => Promise<PieResponse<User, ApiError>>",
		"export function createApiClient(options?: Partial<PieOptions>)",
		`prefix: "/api"`,
		`baseUrl: "https://api.example.com"`,
	}

	for _, want := range expectedSnippets {
		if !strings.Contains(out, want) {
			t.Errorf("generated JSON client missing %q\n--- output ---\n%s", want, out)
		}
	}
}

func TestGenerateAPI_YAML(t *testing.T) {
	tmpDir := t.TempDir()
	specPath := filepath.Join(tmpDir, "openapi.yaml")

	yamlSpec := `openapi: 3.1.0
info:
  title: Projects YAML API
  version: "1.4.2" # inline comment
components:
  schemas:
    Status:
      type: string
      enum: [active, archived]
    Project:
      type: object
      required:
        - id
        - name
      properties:
        id:
          type: integer
        name:
          type: string
        status:
          $ref: '#/components/schemas/Status'
        tags:
          type: array
          items: { type: string }
    CreateProjectBody:
      type: object
      required: [name]
      properties:
        name:
          type: string
    ErrorPayload:
      type: object
      required: [error]
      properties:
        error:
          type: string
paths:
  /api/projects:
    get:
      parameters:
        - name: active
          in: query
          required: false
          schema:
            type: boolean
      responses:
        '200':
          description: List of projects
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Project'
        400:
          description: Invalid query
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorPayload'
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateProjectBody'
      responses:
        200:
          description: Created project
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Project'
        400:
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorPayload'
  /api/projects/{id}:
    get:
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        200:
          description: Single project
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Project'
        400:
          description: Bad id
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorPayload'
`

	if err := os.WriteFile(specPath, []byte(yamlSpec), 0o644); err != nil {
		t.Fatalf("failed to write yaml spec: %v", err)
	}

	gotOut, err := GenerateAPI(GenerateOptions{
		Spec: specPath,
		Root: tmpDir,
	})
	if err != nil {
		t.Fatalf("GenerateAPI(yaml) failed: %v", err)
	}

	wantDefaultOut := filepath.Join(tmpDir, "core/api/generated.ts")
	if gotOut != wantDefaultOut {
		t.Fatalf("expected default output path %q, got %q", wantDefaultOut, gotOut)
	}

	contentBytes, err := os.ReadFile(gotOut)
	if err != nil {
		t.Fatalf("failed to read generated output: %v", err)
	}
	out := string(contentBytes)

	expectedSnippets := []string{
		"// Title: Projects YAML API",
		"// Version: 1.4.2",
		`export type Status = "active" | "archived"`,
		"export interface Project {",
		"id: number",
		"name: string",
		"status?: Status",
		"tags?: string[]",
		"export interface CreateProjectBody {",
		"export interface ErrorPayload {",
		"export type ApiRoutes = {",
		"projects: {",
		"(id: string | number | { id: string | number }): {",
		"get: (options?: { headers?: Record<string, string>; baseUrl?: string; signal?: AbortSignal }) => Promise<PieResponse<Project, ErrorPayload>>",
		"get: (options?: { query?: { active?: boolean }; headers?: Record<string, string>; baseUrl?: string; signal?: AbortSignal }) => Promise<PieResponse<Project[], ErrorPayload>>",
		"post: (options?: { body: CreateProjectBody; headers?: Record<string, string>; baseUrl?: string; signal?: AbortSignal }) => Promise<PieResponse<Project, ErrorPayload>>",
		"export function createApiClient(options?: Partial<PieOptions>)",
		`prefix: "/api"`,
	}

	for _, want := range expectedSnippets {
		if !strings.Contains(out, want) {
			t.Errorf("generated YAML client missing %q\n--- output ---\n%s", want, out)
		}
	}
}

func TestGenerateAPI_CodeInjectionPrevention(t *testing.T) {
	tmpDir := t.TempDir()
	specPath := filepath.Join(tmpDir, "evil.json")
	outPath := filepath.Join(tmpDir, "generated.ts")

	evilSpec := `{
  "openapi": "3.0.3",
  "info": {
    "title": "Evil API\nexport const pwned = true;\r\u2028\u2029// tail",
    "version": "1.0.0\nexport const badVer = 1;"
  },
  "components": {
    "schemas": {
      "Bad;Schema{}": {
        "type": "object",
        "properties": {
          "ok": { "type": "string" }
        }
      },
      "class": {
        "type": "string"
      }
    }
  },
  "paths": {
    "/api/items/{bad param): any; }": {
      "get": {
        "parameters": [
          {
            "name": "q; evil: any",
            "in": "query",
            "required": false,
            "schema": { "type": "string" }
          },
          {
            "name": "class",
            "in": "query",
            "required": true,
            "schema": { "type": "number" }
          }
        ],
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/Bad;Schema{}" }
              }
            }
          },
          "400": {
            "description": "Bad",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/class" }
              }
            }
          }
        }
      }
    }
  }
}`

	if err := os.WriteFile(specPath, []byte(evilSpec), 0o644); err != nil {
		t.Fatal(err)
	}

	gotOut, err := GenerateAPI(GenerateOptions{
		Spec:  specPath,
		OutTS: outPath,
		Root:  tmpDir,
	})
	if err != nil {
		t.Fatalf("GenerateAPI failed: %v", err)
	}

	raw, err := os.ReadFile(gotOut)
	if err != nil {
		t.Fatal(err)
	}
	out := string(raw)

	for _, line := range strings.Split(out, "\n") {
		if strings.HasPrefix(line, "export const pwned") || strings.HasPrefix(line, "export const badVer") {
			t.Fatalf("line injection occurred in generated TS: %q", line)
		}
	}

	if !strings.Contains(out, "// Title: Evil API export const pwned = true;   // tail\n") {
		t.Errorf("expected sanitized Title comment, got:\n%s", out)
	}
	if !strings.Contains(out, "// Version: 1.0.0 export const badVer = 1;\n") {
		t.Errorf("expected sanitized Version comment, got:\n%s", out)
	}
	if !strings.Contains(out, "export interface _Bad_Schema__ {") {
		t.Errorf("expected sanitized schema interface name, got:\n%s", out)
	}
	if !strings.Contains(out, "export type _class = string") {
		t.Errorf("expected reserved keyword schema name to be prefixed, got:\n%s", out)
	}
	if !strings.Contains(out, `(_bad_param___any__: string | number | { "bad param): any; ": string | number }):`) {
		t.Errorf("expected sanitized dynamicChild signature, got:\n%s", out)
	}
	if !strings.Contains(out, `class: number; "q; evil: any"?: string`) {
		t.Errorf("expected sanitized query param keys, got:\n%s", out)
	}
	if !strings.Contains(out, `Promise<PieResponse<_Bad_Schema__, _class>>`) {
		t.Errorf("expected sanitized ref names in PieResponse, got:\n%s", out)
	}
}

func TestParseYAMLOrJSON_RecursionAndFlow(t *testing.T) {
	// Deep block nesting > 128 should fail cleanly without stack overflow.
	var sb strings.Builder
	for i := 0; i < 140; i++ {
		sb.WriteString(strings.Repeat(" ", i*2))
		sb.WriteString("k:\n")
	}
	sb.WriteString(strings.Repeat(" ", 140*2))
	sb.WriteString("leaf: 1\n")
	if _, err := ParseYAMLOrJSON(sb.String()); err == nil {
		t.Fatalf("expected error for YAML exceeding max recursion depth")
	}

	// Deep flow nesting > 128 should fail cleanly.
	deepFlow := "root: " + strings.Repeat("[", 140) + "1" + strings.Repeat("]", 140) + "\n"
	if _, err := ParseYAMLOrJSON(deepFlow); err == nil {
		t.Fatalf("expected error for flow YAML exceeding max recursion depth")
	}

	// Large multiline flow array should parse cleanly.
	var flowSB strings.Builder
	flowSB.WriteString("items: [\n")
	for i := 0; i < 2000; i++ {
		flowSB.WriteString("  \"item\",\n")
	}
	flowSB.WriteString("  \"last\"\n]\n")
	parsed, err := ParseYAMLOrJSON(flowSB.String())
	if err != nil {
		t.Fatalf("unexpected error parsing multiline flow array: %v", err)
	}
	items, ok := parsed["items"].([]any)
	if !ok || len(items) != 2001 {
		t.Fatalf("expected 2001 items, got %T len=%d", parsed["items"], len(items))
	}
}
