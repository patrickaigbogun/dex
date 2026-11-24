package pie

import (
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"strings"
	"unicode"
)

const maxYAMLRecursionDepth = 128

type yamlLine struct {
	num    int
	indent int
	text   string
}

// ParseYAMLOrJSON parses an OpenAPI specification from JSON or YAML into a map.
func ParseYAMLOrJSON(input string) (map[string]any, error) {
	trimmed := strings.TrimSpace(input)
	if trimmed == "" {
		return map[string]any{}, nil
	}

	var jsonOut map[string]any
	if err := json.Unmarshal([]byte(trimmed), &jsonOut); err == nil {
		if jsonOut == nil {
			jsonOut = map[string]any{}
		}
		return jsonOut, nil
	}

	lines := preprocessYAML(input)
	if len(lines) == 0 {
		return map[string]any{}, nil
	}

	idx := 0
	val, err := parseYAMLNode(lines, &idx, lines[0].indent, 0)
	if err != nil {
		return nil, err
	}
	if val == nil {
		return map[string]any{}, nil
	}
	m, ok := val.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("expected YAML root to be a mapping, got %T", val)
	}
	return m, nil
}

func preprocessYAML(input string) []yamlLine {
	rawLines := strings.Split(input, "\n")
	var out []yamlLine
	for i, raw := range rawLines {
		raw = strings.TrimRight(raw, "\r")
		if strings.TrimSpace(raw) == "" {
			continue
		}
		indent := 0
		for indent < len(raw) && raw[indent] == ' ' {
			indent++
		}
		rest := raw[indent:]
		if strings.HasPrefix(rest, "#") {
			continue
		}
		// Skip YAML directives and document markers at top level.
		if indent == 0 {
			if strings.HasPrefix(rest, "%YAML") || strings.HasPrefix(rest, "%TAG") {
				continue
			}
			strippedMarker := stripYAMLComment(rest)
			if strippedMarker == "---" || strippedMarker == "..." {
				continue
			}
		}
		out = append(out, yamlLine{
			num:    i + 1,
			indent: indent,
			text:   rest,
		})
	}
	return out
}

func stripYAMLComment(s string) string {
	inSingle := false
	inDouble := false
	escaped := false
	for i := 0; i < len(s); i++ {
		c := s[i]
		if inDouble {
			if escaped {
				escaped = false
				continue
			}
			if c == '\\' {
				escaped = true
				continue
			}
			if c == '"' {
				inDouble = false
			}
			continue
		}
		if inSingle {
			if c == '\'' {
				if i+1 < len(s) && s[i+1] == '\'' {
					i++
					continue
				}
				inSingle = false
			}
			continue
		}
		if c == '"' {
			inDouble = true
			continue
		}
		if c == '\'' {
			inSingle = true
			continue
		}
		if c == '#' && (i == 0 || s[i-1] == ' ' || s[i-1] == '\t') {
			return strings.TrimRight(s[:i], " \t")
		}
	}
	return strings.TrimRight(s, " \t")
}

func isSequenceLine(text string) bool {
	return text == "-" || strings.HasPrefix(text, "- ") || strings.HasPrefix(text, "-\t")
}

func parseYAMLNode(lines []yamlLine, idx *int, minIndent int, depth int) (any, error) {
	if depth > maxYAMLRecursionDepth {
		return nil, fmt.Errorf("yaml maximum recursion depth (%d) exceeded", maxYAMLRecursionDepth)
	}
	if *idx >= len(lines) {
		return nil, nil
	}
	cur := lines[*idx]
	if cur.indent < minIndent {
		return nil, nil
	}
	if isSequenceLine(cur.text) {
		return parseYAMLSequence(lines, idx, cur.indent, depth+1)
	}
	clean := stripYAMLComment(cur.text)
	if strings.HasPrefix(clean, "[") || strings.HasPrefix(clean, "{") {
		flowText := collectFlowText(lines, idx)
		return parseFlowValueDepth(flowText, depth)
	}
	if _, _, ok := splitYAMLKeyVal(clean); ok {
		return parseYAMLMapping(lines, idx, cur.indent, depth)
	}
	*idx++
	return parseYAMLScalar(clean), nil
}

func parseYAMLMapping(lines []yamlLine, idx *int, mapIndent int, depth int) (map[string]any, error) {
	result := make(map[string]any)
	for *idx < len(lines) {
		cur := lines[*idx]
		if cur.indent < mapIndent {
			break
		}
		if cur.indent > mapIndent {
			return nil, fmt.Errorf("yaml line %d: unexpected indentation %d (expected %d)", cur.num, cur.indent, mapIndent)
		}
		if isSequenceLine(cur.text) {
			break
		}

		clean := stripYAMLComment(cur.text)
		if clean == "" {
			*idx++
			continue
		}
		key, valStr, ok := splitYAMLKeyVal(clean)
		if !ok {
			return nil, fmt.Errorf("yaml line %d: expected key: value mapping, got %q", cur.num, cur.text)
		}
		*idx++

		val, err := parseYAMLValue(lines, idx, mapIndent, valStr, depth)
		if err != nil {
			return nil, err
		}
		result[key] = val
	}
	return result, nil
}

func parseYAMLValue(lines []yamlLine, idx *int, parentIndent int, valStr string, depth int) (any, error) {
	if valStr == "" {
		if *idx < len(lines) {
			next := lines[*idx]
			if next.indent > parentIndent {
				return parseYAMLNode(lines, idx, parentIndent+1, depth+1)
			}
			if next.indent == parentIndent && isSequenceLine(next.text) {
				return parseYAMLSequence(lines, idx, parentIndent, depth+1)
			}
		}
		return nil, nil
	}

	if isBlockScalarIndicator(valStr) {
		return parseBlockScalar(lines, idx, parentIndent, valStr), nil
	}

	if strings.HasPrefix(valStr, "[") || strings.HasPrefix(valStr, "{") {
		flowText := valStr
		if !isFlowBalanced(flowText) {
			flowText = collectRemainingFlow(flowText, lines, idx)
		}
		return parseFlowValueDepth(flowText, depth)
	}

	return parseYAMLScalar(valStr), nil
}

func parseYAMLSequence(lines []yamlLine, idx *int, seqIndent int, depth int) ([]any, error) {
	if depth > maxYAMLRecursionDepth {
		return nil, fmt.Errorf("yaml maximum recursion depth (%d) exceeded", maxYAMLRecursionDepth)
	}
	var result []any
	for *idx < len(lines) {
		cur := lines[*idx]
		if cur.indent != seqIndent || !isSequenceLine(cur.text) {
			break
		}

		afterDash := cur.text[1:]
		trimmedAfter := strings.TrimLeft(afterDash, " \t")
		spacesAfterDash := len(afterDash) - len(trimmedAfter)
		clean := stripYAMLComment(trimmedAfter)
		*idx++

		if clean == "" {
			if *idx < len(lines) && lines[*idx].indent > seqIndent {
				child, err := parseYAMLNode(lines, idx, seqIndent+1, depth+1)
				if err != nil {
					return nil, err
				}
				result = append(result, child)
			} else {
				result = append(result, nil)
			}
			continue
		}

		if isBlockScalarIndicator(clean) {
			result = append(result, parseBlockScalar(lines, idx, seqIndent, clean))
			continue
		}

		if strings.HasPrefix(clean, "[") || strings.HasPrefix(clean, "{") {
			flowText := clean
			if !isFlowBalanced(flowText) {
				flowText = collectRemainingFlow(flowText, lines, idx)
			}
			val, err := parseFlowValueDepth(flowText, depth)
			if err != nil {
				return nil, err
			}
			result = append(result, val)
			continue
		}

		if isSequenceLine(clean) {
			// Nested inline sequence e.g. "- - a"
			itemIndent := seqIndent + 1 + spacesAfterDash
			synth := append([]yamlLine{{num: cur.num, indent: itemIndent, text: trimmedAfter}}, lines[*idx:]...)
			subIdx := 0
			subVal, err := parseYAMLSequence(synth, &subIdx, itemIndent, depth+1)
			if err != nil {
				return nil, err
			}
			*idx += subIdx - 1
			result = append(result, subVal)
			continue
		}

		if key, valStr, ok := splitYAMLKeyVal(clean); ok {
			itemIndent := seqIndent + 1 + spacesAfterDash
			itemMap := make(map[string]any)
			val, err := parseYAMLValue(lines, idx, itemIndent, valStr, depth)
			if err != nil {
				return nil, err
			}
			itemMap[key] = val

			if *idx < len(lines) && lines[*idx].indent == itemIndent && !isSequenceLine(lines[*idx].text) {
				restMap, err := parseYAMLMapping(lines, idx, itemIndent, depth)
				if err != nil {
					return nil, err
				}
				for k, v := range restMap {
					itemMap[k] = v
				}
			}
			result = append(result, itemMap)
			continue
		}

		result = append(result, parseYAMLScalar(clean))
	}
	if result == nil {
		result = []any{}
	}
	return result, nil
}

func isBlockScalarIndicator(s string) bool {
	if s == "|" || s == ">" {
		return true
	}
	if len(s) >= 2 && (s[0] == '|' || s[0] == '>') {
		for _, ch := range s[1:] {
			if ch != '-' && ch != '+' && (ch < '1' || ch > '9') {
				return false
			}
		}
		return true
	}
	return false
}

func parseBlockScalar(lines []yamlLine, idx *int, parentIndent int, indicator string) string {
	folded := strings.HasPrefix(indicator, ">")
	chompStrip := strings.Contains(indicator, "-")
	var blockIndent int
	var collected []string
	for *idx < len(lines) {
		cur := lines[*idx]
		if cur.indent <= parentIndent {
			break
		}
		if blockIndent == 0 {
			blockIndent = cur.indent
		}
		if cur.indent < blockIndent {
			break
		}
		extraSpaces := strings.Repeat(" ", cur.indent-blockIndent)
		collected = append(collected, extraSpaces+cur.text)
		*idx++
	}
	if len(collected) == 0 {
		return ""
	}
	var out string
	if folded {
		out = strings.Join(collected, " ")
	} else {
		out = strings.Join(collected, "\n")
	}
	if !chompStrip {
		out += "\n"
	}
	return out
}

func collectFlowText(lines []yamlLine, idx *int) string {
	first := stripYAMLComment(lines[*idx].text)
	*idx++
	if isFlowBalanced(first) {
		return first
	}
	return collectRemainingFlow(first, lines, idx)
}

type flowBalanceState struct {
	depth    int
	inSingle bool
	inDouble bool
	escaped  bool
}

func (st *flowBalanceState) feed(s string) {
	for i := 0; i < len(s); i++ {
		c := s[i]
		if st.inDouble {
			if st.escaped {
				st.escaped = false
				continue
			}
			if c == '\\' {
				st.escaped = true
				continue
			}
			if c == '"' {
				st.inDouble = false
			}
			continue
		}
		if st.inSingle {
			if c == '\'' {
				if i+1 < len(s) && s[i+1] == '\'' {
					i++
					continue
				}
				st.inSingle = false
			}
			continue
		}
		switch c {
		case '"':
			st.inDouble = true
		case '\'':
			st.inSingle = true
		case '[', '{':
			st.depth++
		case ']', '}':
			st.depth--
		}
	}
}

func (st *flowBalanceState) balanced() bool {
	return st.depth <= 0 && !st.inSingle && !st.inDouble
}

func collectRemainingFlow(initial string, lines []yamlLine, idx *int) string {
	var sb strings.Builder
	var st flowBalanceState
	sb.WriteString(initial)
	st.feed(initial)
	for *idx < len(lines) && !st.balanced() {
		next := stripYAMLComment(lines[*idx].text)
		sb.WriteByte(' ')
		sb.WriteString(next)
		st.feed(" ")
		st.feed(next)
		*idx++
	}
	return sb.String()
}

func isFlowBalanced(s string) bool {
	var st flowBalanceState
	st.feed(s)
	return st.balanced()
}

func splitYAMLKeyVal(s string) (key string, val string, ok bool) {
	if s == "" {
		return "", "", false
	}
	if s[0] == '"' {
		endIdx, unquoted, err := parseDoubleQuotedPrefix(s)
		if err != nil {
			return "", "", false
		}
		rest := strings.TrimLeft(s[endIdx:], " \t")
		if strings.HasPrefix(rest, ":") {
			afterColon := rest[1:]
			if afterColon == "" || afterColon[0] == ' ' || afterColon[0] == '\t' {
				return unquoted, strings.TrimSpace(afterColon), true
			}
		}
		return "", "", false
	}
	if s[0] == '\'' {
		endIdx, unquoted, err := parseSingleQuotedPrefix(s)
		if err != nil {
			return "", "", false
		}
		rest := strings.TrimLeft(s[endIdx:], " \t")
		if strings.HasPrefix(rest, ":") {
			afterColon := rest[1:]
			if afterColon == "" || afterColon[0] == ' ' || afterColon[0] == '\t' {
				return unquoted, strings.TrimSpace(afterColon), true
			}
		}
		return "", "", false
	}

	for i := 0; i < len(s); i++ {
		if s[i] == ':' {
			if i == len(s)-1 || s[i+1] == ' ' || s[i+1] == '\t' {
				k := strings.TrimSpace(s[:i])
				v := strings.TrimSpace(s[i+1:])
				return k, v, true
			}
		}
	}
	return "", "", false
}

func parseDoubleQuotedPrefix(s string) (int, string, error) {
	var sb strings.Builder
	escaped := false
	for i := 1; i < len(s); i++ {
		c := s[i]
		if escaped {
			switch c {
			case 'n':
				sb.WriteByte('\n')
			case 't':
				sb.WriteByte('\t')
			case 'r':
				sb.WriteByte('\r')
			case '\\', '"', '/':
				sb.WriteByte(c)
			default:
				sb.WriteByte('\\')
				sb.WriteByte(c)
			}
			escaped = false
			continue
		}
		if c == '\\' {
			escaped = true
			continue
		}
		if c == '"' {
			return i + 1, sb.String(), nil
		}
		sb.WriteByte(c)
	}
	return 0, "", fmt.Errorf("unterminated double-quoted string")
}

func parseSingleQuotedPrefix(s string) (int, string, error) {
	var sb strings.Builder
	for i := 1; i < len(s); i++ {
		c := s[i]
		if c == '\'' {
			if i+1 < len(s) && s[i+1] == '\'' {
				sb.WriteByte('\'')
				i++
				continue
			}
			return i + 1, sb.String(), nil
		}
		sb.WriteByte(c)
	}
	return 0, "", fmt.Errorf("unterminated single-quoted string")
}

func parseYAMLScalar(s string) any {
	s = strings.TrimSpace(s)
	if s == "" || s == "null" || s == "Null" || s == "NULL" || s == "~" {
		return nil
	}
	if s[0] == '"' {
		if endIdx, unquoted, err := parseDoubleQuotedPrefix(s); err == nil && endIdx == len(s) {
			return unquoted
		}
	}
	if s[0] == '\'' {
		if endIdx, unquoted, err := parseSingleQuotedPrefix(s); err == nil && endIdx == len(s) {
			return unquoted
		}
	}
	switch s {
	case "true", "True", "TRUE":
		return true
	case "false", "False", "FALSE":
		return false
	}

	if looksNumeric(s) {
		if iVal, err := strconv.ParseInt(s, 10, 64); err == nil {
			return iVal
		}
		if fVal, err := strconv.ParseFloat(s, 64); err == nil && !math.IsNaN(fVal) && !math.IsInf(fVal, 0) {
			return fVal
		}
	}
	return s
}

func looksNumeric(s string) bool {
	if s == "" {
		return false
	}
	start := 0
	if s[0] == '-' || s[0] == '+' {
		start = 1
	}
	if start >= len(s) {
		return false
	}
	return (s[start] >= '0' && s[start] <= '9') || s[start] == '.'
}

type flowParser struct {
	s   string
	pos int
}

func parseFlowValue(s string) (any, error) {
	return parseFlowValueDepth(s, 0)
}

func parseFlowValueDepth(s string, depth int) (any, error) {
	p := &flowParser{s: strings.TrimSpace(s)}
	val, err := p.parseValue(depth)
	if err != nil {
		return nil, err
	}
	p.skipWS()
	if p.pos < len(p.s) {
		return nil, fmt.Errorf("unexpected trailing flow characters: %q", p.s[p.pos:])
	}
	return val, nil
}

func (p *flowParser) skipWS() {
	for p.pos < len(p.s) && unicode.IsSpace(rune(p.s[p.pos])) {
		p.pos++
	}
}

func (p *flowParser) parseValue(depth int) (any, error) {
	if depth > maxYAMLRecursionDepth {
		return nil, fmt.Errorf("yaml flow maximum recursion depth (%d) exceeded", maxYAMLRecursionDepth)
	}
	p.skipWS()
	if p.pos >= len(p.s) {
		return nil, nil
	}
	switch p.s[p.pos] {
	case '[':
		return p.parseArray(depth + 1)
	case '{':
		return p.parseObject(depth + 1)
	case '"':
		endIdx, val, err := parseDoubleQuotedPrefix(p.s[p.pos:])
		if err != nil {
			return nil, err
		}
		p.pos += endIdx
		return val, nil
	case '\'':
		endIdx, val, err := parseSingleQuotedPrefix(p.s[p.pos:])
		if err != nil {
			return nil, err
		}
		p.pos += endIdx
		return val, nil
	default:
		start := p.pos
		for p.pos < len(p.s) {
			c := p.s[p.pos]
			if c == ',' || c == ']' || c == '}' {
				break
			}
			p.pos++
		}
		return parseYAMLScalar(p.s[start:p.pos]), nil
	}
}

func (p *flowParser) parseArray(depth int) ([]any, error) {
	if depth > maxYAMLRecursionDepth {
		return nil, fmt.Errorf("yaml flow maximum recursion depth (%d) exceeded", maxYAMLRecursionDepth)
	}
	p.pos++ // skip '['
	arr := []any{}
	for {
		p.skipWS()
		if p.pos >= len(p.s) {
			return nil, fmt.Errorf("unterminated flow array")
		}
		if p.s[p.pos] == ']' {
			p.pos++
			return arr, nil
		}
		val, err := p.parseValue(depth)
		if err != nil {
			return nil, err
		}
		arr = append(arr, val)
		p.skipWS()
		if p.pos < len(p.s) && p.s[p.pos] == ',' {
			p.pos++
			continue
		}
		if p.pos < len(p.s) && p.s[p.pos] == ']' {
			p.pos++
			return arr, nil
		}
		return nil, fmt.Errorf("expected ',' or ']' in flow array at %q", p.s[p.pos:])
	}
}

func (p *flowParser) parseObject(depth int) (map[string]any, error) {
	if depth > maxYAMLRecursionDepth {
		return nil, fmt.Errorf("yaml flow maximum recursion depth (%d) exceeded", maxYAMLRecursionDepth)
	}
	p.pos++ // skip '{'
	obj := make(map[string]any)
	for {
		p.skipWS()
		if p.pos >= len(p.s) {
			return nil, fmt.Errorf("unterminated flow object")
		}
		if p.s[p.pos] == '}' {
			p.pos++
			return obj, nil
		}
		key, err := p.parseKey()
		if err != nil {
			return nil, err
		}
		p.skipWS()
		if p.pos >= len(p.s) || p.s[p.pos] != ':' {
			return nil, fmt.Errorf("expected ':' after key %q in flow object", key)
		}
		p.pos++ // skip ':'
		val, err := p.parseValue(depth)
		if err != nil {
			return nil, err
		}
		obj[key] = val
		p.skipWS()
		if p.pos < len(p.s) && p.s[p.pos] == ',' {
			p.pos++
			continue
		}
		if p.pos < len(p.s) && p.s[p.pos] == '}' {
			p.pos++
			return obj, nil
		}
		return nil, fmt.Errorf("expected ',' or '}' in flow object at %q", p.s[p.pos:])
	}
}

func (p *flowParser) parseKey() (string, error) {
	p.skipWS()
	if p.pos >= len(p.s) {
		return "", fmt.Errorf("unexpected EOF while reading flow key")
	}
	switch p.s[p.pos] {
	case '"':
		endIdx, val, err := parseDoubleQuotedPrefix(p.s[p.pos:])
		if err != nil {
			return "", err
		}
		p.pos += endIdx
		return val, nil
	case '\'':
		endIdx, val, err := parseSingleQuotedPrefix(p.s[p.pos:])
		if err != nil {
			return "", err
		}
		p.pos += endIdx
		return val, nil
	default:
		start := p.pos
		for p.pos < len(p.s) {
			c := p.s[p.pos]
			if c == ':' || c == ',' || c == '}' {
				break
			}
			p.pos++
		}
		return strings.TrimSpace(p.s[start:p.pos]), nil
	}
}
