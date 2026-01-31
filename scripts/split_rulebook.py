#!/usr/bin/env python3
"""
PDF to Markdown Splitter for Hellenvald Core Rulebook
Extracts sections from PDF and converts to individual Markdown files.
"""

import fitz  # PyMuPDF (pymupdf package imports as 'fitz')
import pdfplumber
import re
import os
from pathlib import Path
from typing import List, Tuple, Dict

# Constants
PDF_PATH = "Hellenvald Core Rulebook.pdf"
OUTPUT_DIR = "output/rulebook"
TOC_PAGE = 7  # Page number (1-indexed)


def extract_toc(pdf_doc) -> List[Tuple[str, int]]:
    """Extract TOC from page 7, return [(name, page)]"""
    toc_page_idx = TOC_PAGE - 1
    text = pdf_doc[toc_page_idx].get_text()

    # Pattern: section name followed by dots/tabs/spaces and page number
    # Handles Russian text and various separators
    pattern = r'(.+?)[.\s\t]+(\d+)\s*$'

    sections = []
    for line in text.split('\n'):
        line = line.strip()
        if not line:
            continue

        match = re.match(pattern, line)
        if match:
            section_name = match.group(1).strip()
            page_num = int(match.group(2))
            sections.append((section_name, page_num))

    return sections


def extract_tables(pdf_path: str) -> Dict[int, List]:
    """Extract all tables with pdfplumber, return {page_num: [tables]}"""
    tables_by_page = {}

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            tables = page.extract_tables()
            if tables:
                tables_by_page[page_num] = tables

    return tables_by_page


def clean_text(text: str) -> str:
    """Remove OCR artifacts, excessive newlines"""
    # Remove page markers
    text = re.sub(r'--- PAGE \d+ ---\n?', '', text)

    # Remove [OCR] tags
    text = re.sub(r'\[OCR\]', '', text)

    # Clean excessive newlines (more than 2 consecutive)
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()


def convert_headers(text: str) -> str:
    """Convert ALL CAPS lines to ## markdown headers"""
    lines = text.split('\n')
    result = []

    for line in lines:
        stripped = line.strip()
        # Check if line is ALL CAPS and has reasonable length (3-100 chars)
        if stripped and stripped.isupper() and 3 <= len(stripped) <= 100:
            # Skip if it's just numbers or special chars
            if re.search(r'[A-ZА-ЯЁ]', stripped):
                result.append(f"## {stripped}")
                continue

        result.append(line)

    return '\n'.join(result)


def table_to_markdown(table_data: List[List[str]]) -> str:
    """Convert 2D array to markdown table

    Note: pdfplumber may extract tables with extra empty columns
    due to PDF layout. Manual cleanup may be needed.
    """
    if not table_data:
        return ""

    # Clean None values and convert to strings
    cleaned = []
    for row in table_data:
        cleaned_row = [str(cell).strip() if cell else "" for cell in row]
        cleaned.append(cleaned_row)

    if not cleaned:
        return ""

    # Remove fully empty columns
    num_cols = max(len(row) for row in cleaned)
    cols_to_keep = []
    for col_idx in range(num_cols):
        has_content = False
        for row in cleaned:
            if col_idx < len(row) and row[col_idx]:
                has_content = True
                break
        if has_content:
            cols_to_keep.append(col_idx)

    # Filter rows to keep only non-empty columns
    filtered = []
    for row in cleaned:
        filtered_row = [row[i] if i < len(row) else "" for i in cols_to_keep]
        filtered.append(filtered_row)

    if not filtered or not cols_to_keep:
        return ""

    # Build markdown table
    lines = []

    # Header row
    header = filtered[0]
    lines.append("| " + " | ".join(header) + " |")

    # Separator
    lines.append("| " + " | ".join(["---"] * len(header)) + " |")

    # Data rows
    for row in filtered[1:]:
        # Pad row if shorter than header
        while len(row) < len(header):
            row.append("")
        lines.append("| " + " | ".join(row[:len(header)]) + " |")

    return "\n".join(lines)


def process_section(pdf_doc, name: str, start_idx: int, end_idx: int,
                    tables_by_page: Dict[int, List]) -> str:
    """Extract and process a single section

    Args:
        start_idx, end_idx: PDF page indices (0-based), NOT document page numbers
        tables_by_page: keyed by PDF page number (1-based index + 1)
    """
    content_parts = []

    # Add section title as H1
    content_parts.append(f"# {name}\n")

    # Extract text from page range
    for page_idx in range(start_idx, end_idx + 1):
        # Add page marker for debugging (using PDF page number for clarity)
        pdf_page_num = page_idx + 1
        content_parts.append(f"\n<!-- PDF Page {pdf_page_num} -->\n")

        # Extract text
        page_text = pdf_doc[page_idx].get_text()
        cleaned = clean_text(page_text)
        converted = convert_headers(cleaned)
        content_parts.append(converted)

        # Add tables if present on this page
        # pdfplumber uses 1-based page numbers
        if pdf_page_num in tables_by_page:
            for table in tables_by_page[pdf_page_num]:
                md_table = table_to_markdown(table)
                if md_table:
                    content_parts.append(f"\n\n{md_table}\n")

    return "\n".join(content_parts)


def get_filename_mapping() -> Dict[str, str]:
    """Define section name to filename mapping"""
    # This will be populated based on actual TOC entries
    # Format: section_name -> "NN_Filename.md"
    return {
        # Will be filled dynamically based on TOC order
    }


def main():
    print("Starting PDF to Markdown conversion...")

    # 1. Open PDF
    print(f"Opening PDF: {PDF_PATH}")
    pdf_doc = fitz.open(PDF_PATH)
    total_pages = len(pdf_doc)
    print(f"Total pages: {total_pages}")

    # 2. Extract tables
    print("Extracting tables from all pages...")
    tables_by_page = extract_tables(PDF_PATH)
    print(f"Found tables on {len(tables_by_page)} pages")

    # 3. Define major sections manually
    # Based on RPG rulebook structure
    # Note: Document page numbers in TOC are offset from PDF indices by +6
    # (e.g., document page 2 = PDF index 7)
    PAGE_OFFSET = 6
    major_sections = [
        ("Table of Contents", 7 + PAGE_OFFSET, 7 + PAGE_OFFSET, "00_Table_of_Contents"),
        ("Introduction", 2 + PAGE_OFFSET, 5 + PAGE_OFFSET, "01_Introduction"),
        ("Character Creation", 6 + PAGE_OFFSET, 10 + PAGE_OFFSET, "02_Character_Creation"),
        ("Classes", 11 + PAGE_OFFSET, 17 + PAGE_OFFSET, "03_Classes"),
        ("Skills", 18 + PAGE_OFFSET, 20 + PAGE_OFFSET, "04_Skills"),
        ("Special Traits", 21 + PAGE_OFFSET, 30 + PAGE_OFFSET, "05_Special_Traits"),
        ("Equipment", 31 + PAGE_OFFSET, 41 + PAGE_OFFSET, "06_Equipment"),
        ("Combat", 42 + PAGE_OFFSET, 50 + PAGE_OFFSET, "07_Combat"),
        ("Adventures", 51 + PAGE_OFFSET, 76 + PAGE_OFFSET, "08_Adventures"),
        ("Mysteries", 77 + PAGE_OFFSET, 109 + PAGE_OFFSET, "09_Mysteries"),
        ("Bestiary", 110 + PAGE_OFFSET, min(132 + PAGE_OFFSET, 131), "10_Bestiary"),  # Cap at last page index
    ]

    # 4. Process each section
    print(f"\nCreating output directory: {OUTPUT_DIR}")
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

    for name, start_idx, end_idx, file_base in major_sections:
        filename = f"{file_base}.md"
        output_path = os.path.join(OUTPUT_DIR, filename)

        print(f"\nProcessing: {name} (PDF indices {start_idx}-{end_idx})")
        print(f"  Output: {filename}")

        # Process section (using PDF indices, not document page numbers)
        content = process_section(pdf_doc, name, start_idx, end_idx, tables_by_page)

        # 5. Write markdown file
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)

        file_size = os.path.getsize(output_path)
        print(f"  Written: {file_size} bytes")

    pdf_doc.close()
    print("\n✓ Conversion complete!")
    print(f"Output files in: {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
