package version

import (
	"fmt"
	"strconv"
	"strings"
)

type SemverParts [3]int

// ParseSemverLikeTag strips leading v, splits on ., requires at least 2 numeric segments,
// normalizes to 3 ints, strict = len(segments) == 3 (matching parseSemverLikeTag in framework/packages/cli/src/cli.ts).
func ParseSemverLikeTag(tag string) (parts SemverParts, strict bool, ok bool) {
	raw := strings.TrimSpace(tag)
	if raw == "" {
		return SemverParts{}, false, false
	}
	t := raw
	if strings.HasPrefix(t, "v") {
		t = t[1:]
	}
	rawSegments := strings.Split(t, ".")
	var segments []string
	for _, seg := range rawSegments {
		if seg != "" {
			segments = append(segments, seg)
		}
	}
	if len(segments) < 2 {
		return SemverParts{}, false, false
	}

	var nums []int
	for _, seg := range segments {
		if !isNumeric(seg) {
			return SemverParts{}, false, false
		}
		val, err := strconv.Atoi(seg)
		if err != nil {
			return SemverParts{}, false, false
		}
		nums = append(nums, val)
	}

	for len(nums) < 3 {
		nums = append(nums, 0)
	}

	parts = SemverParts{nums[0], nums[1], nums[2]}
	strict = len(segments) == 3
	return parts, strict, true
}

func isNumeric(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

func CompareSemver(a, b SemverParts) int {
	for i := 0; i < 3; i++ {
		if a[i] != b[i] {
			return a[i] - b[i]
		}
	}
	return 0
}

func FormatSemverTag(parts SemverParts) string {
	return fmt.Sprintf("v%d.%d.%d", parts[0], parts[1], parts[2])
}

func BumpSemver(current SemverParts, kind string) (SemverParts, error) {
	maj, min, pat := current[0], current[1], current[2]
	switch kind {
	case "patch":
		return SemverParts{maj, min, pat + 1}, nil
	case "minor":
		return SemverParts{maj, min + 1, 0}, nil
	case "major":
		return SemverParts{maj + 1, 0, 0}, nil
	default:
		return SemverParts{}, fmt.Errorf("unknown bump kind: %s", kind)
	}
}
