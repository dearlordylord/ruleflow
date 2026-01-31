# Hellenvald Core Rulebook - Markdown Conversion

## Overview

This directory contains the Hellenvald Core Rulebook PDF converted to 11 Markdown files, split by major sections.

## Files

| File | Section | Size |
|------|---------|------|
| `00_Table_of_Contents.md` | Table of Contents | ~5.5 KB |
| `01_Introduction.md` | Introduction | ~13 KB |
| `02_Character_Creation.md` | Character Creation | ~19 KB |
| `03_Classes.md` | Classes (Боец/Специалист/Мистик) | ~28 KB |
| `04_Skills.md` | Skills | ~12 KB |
| `05_Special_Traits.md` | Special Traits | ~44 KB |
| `06_Equipment.md` | Equipment | ~57 KB |
| `07_Combat.md` | Combat | ~47 KB |
| `08_Adventures.md` | Adventures | ~145 KB |
| `09_Mysteries.md` | Mysteries/Taинства | ~187 KB |
| `10_Bestiary.md` | Bestiary/Creatures | ~77 KB |

## Conversion Details

- **Source**: `Hellenvald Core Rulebook.pdf` (132 pages)
- **Tool**: Python script using PyMuPDF + pdfplumber
- **Encoding**: UTF-8 (Russian text preserved)
- **Tables**: Extracted and converted to Markdown format
- **Headers**: ALL CAPS lines converted to `## HEADER` format
- **Page markers**: HTML comments `<!-- PDF Page N -->` for reference

## Known Limitations

- Some table headers may be missing (PDF structure doesn't always indicate headers clearly)
- Multi-column PDF layout may cause text extraction order issues in some sections
- OCR artifacts have been cleaned where detected, but manual review recommended
- Some complex table layouts may need manual formatting adjustment

## Generated

Created: 2026-01-31
Script: `scripts/split_rulebook.py`
