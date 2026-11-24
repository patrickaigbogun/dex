package core

import (
	"archive/tar"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

const (
	maxArchiveEntries = 10000
	maxFileBytes      = 64 * 1024 * 1024
	maxTotalBytes     = 256 * 1024 * 1024
)

// SafeJoin safely joins rel under destRoot, rejecting path traversal ("..") or colon segments.
func SafeJoin(destRoot, rel string) (string, error) {
	if strings.ContainsRune(rel, '\x00') {
		return "", fmt.Errorf("unsafe path in template: %s", rel)
	}
	normalized := strings.TrimPrefix(strings.ReplaceAll(rel, "\\", "/"), "/")
	rawParts := strings.Split(normalized, "/")
	parts := make([]string, 0, len(rawParts))
	for _, p := range rawParts {
		if p == "" {
			continue
		}
		if p == "." || p == ".." || strings.Contains(p, ":") {
			return "", fmt.Errorf("unsafe path in template: %s", rel)
		}
		parts = append(parts, p)
	}
	if len(parts) == 0 {
		return "", fmt.Errorf("unsafe path in template: %s", rel)
	}
	cleanRoot := filepath.Clean(destRoot)
	all := make([]string, 0, 1+len(parts))
	all = append(all, cleanRoot)
	all = append(all, parts...)
	joined := filepath.Join(all...)
	relPath, err := filepath.Rel(cleanRoot, joined)
	if err != nil || relPath == "." || relPath == ".." || strings.HasPrefix(relPath, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("unsafe path in template: %s", rel)
	}
	return joined, nil
}

func stripFirstComponent(name string) (string, error) {
	if strings.ContainsRune(name, '\x00') {
		return "", fmt.Errorf("unsafe path in archive: %s", name)
	}
	normalized := strings.ReplaceAll(name, "\\", "/")
	if strings.HasPrefix(normalized, "/") {
		return "", fmt.Errorf("unsafe path in archive: %s", name)
	}
	rawParts := strings.Split(normalized, "/")
	parts := make([]string, 0, len(rawParts))
	for _, p := range rawParts {
		if p == ".." {
			return "", fmt.Errorf("unsafe path in archive: %s", name)
		}
		if p != "" {
			parts = append(parts, p)
		}
	}
	if len(parts) <= 1 {
		return "", nil
	}
	return strings.Join(parts[1:], "/"), nil
}

// ExtractTemplate extracts a .tar.gz archive to destDir, stripping the top-level directory component.
func ExtractTemplate(tgzPath, destDir string) error {
	f, err := os.Open(tgzPath)
	if err != nil {
		return err
	}
	defer f.Close()

	gz, err := gzip.NewReader(f)
	if err != nil {
		return err
	}
	defer gz.Close()

	tr := tar.NewReader(gz)
	var entryCount int
	var totalBytes int64
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}

		entryCount++
		if entryCount > maxArchiveEntries {
			return fmt.Errorf("archive exceeds max entry limit (%d)", maxArchiveEntries)
		}

		rel, err := stripFirstComponent(hdr.Name)
		if err != nil {
			return err
		}

		if hdr.Typeflag == tar.TypeSymlink || hdr.Typeflag == tar.TypeLink {
			return fmt.Errorf("unsafe symlink/hardlink in archive: %s", hdr.Name)
		}

		if rel == "" {
			continue
		}

		outPath, err := SafeJoin(destDir, rel)
		if err != nil {
			return err
		}

		switch hdr.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(outPath, 0o755); err != nil {
				return err
			}
		case tar.TypeReg, tar.TypeRegA:
			if hdr.Size > maxFileBytes {
				return fmt.Errorf("archive entry %s exceeds max file size (%d bytes)", hdr.Name, maxFileBytes)
			}
			if totalBytes+hdr.Size > maxTotalBytes {
				return fmt.Errorf("archive exceeds max total extracted size (%d bytes)", maxTotalBytes)
			}
			if err := os.MkdirAll(filepath.Dir(outPath), 0o755); err != nil {
				return err
			}
			if info, err := os.Lstat(outPath); err == nil {
				if info.Mode()&os.ModeSymlink != 0 {
					return errors.New("refusing to overwrite symlink")
				}
			}
			perm := os.FileMode(0o644) | (os.FileMode(hdr.Mode) & 0o111)
			outFile, err := os.OpenFile(outPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, perm)
			if err != nil {
				return err
			}
			remainingTotal := maxTotalBytes - totalBytes
			limit := int64(maxFileBytes)
			if remainingTotal < limit {
				limit = remainingTotal
			}
			n, copyErr := io.Copy(outFile, io.LimitReader(tr, limit+1))
			totalBytes += n
			closeErr := outFile.Close()
			if copyErr != nil {
				return copyErr
			}
			if n > maxFileBytes {
				return fmt.Errorf("archive entry %s exceeds max file size (%d bytes)", hdr.Name, maxFileBytes)
			}
			if totalBytes > maxTotalBytes {
				return fmt.Errorf("archive exceeds max total extracted size (%d bytes)", maxTotalBytes)
			}
			if closeErr != nil {
				return closeErr
			}
		}
	}

	return nil
}

// ComputeFileSHA256 computes the lowercase hex SHA-256 digest of filePath.
func ComputeFileSHA256(filePath string) (string, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer f.Close()

	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}
