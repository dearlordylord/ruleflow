#!/usr/bin/env python3
"""
Parse Hellenvald Core Rulebook PDF into structured markdown files.
"""
import fitz  # PyMuPDF
import re
import os

PDF_PATH = "rulebook/Hellenvald Core Rulebook.pdf"
OUTPUT_DIR = "rulebook"

def extract_toc(doc):
    """Extract table of contents from page 7 (index 6)"""
    # Page 7 in the document (0-indexed as 6)
    toc_page = doc[6]
    text = toc_page.get_text()

    print("TOC Page Text Preview:")
    print(text[:1000])
    print("\n" + "="*50 + "\n")

    # Define main chapters we want to extract
    # These are the main sections, not subsections
    main_chapters = [
        ("Введение", "Introduction"),
        ("Создание персонажа", "Character Creation"),
        ("Боец", "Fighter"),  # Part of Classes
        ("Специалист", "Specialist"),  # Part of Classes
        ("Мистик", "Mystic"),  # Part of Classes
        ("Навыки", "Skills"),
        ("Особые черты", "Special Traits"),
        ("Снаряжение", "Equipment"),
        ("Столкновения", "Combat"),
        ("Приключения", "Adventures"),
        ("Таинства", "Mysteries"),
        ("Существа", "Bestiary"),
    ]

    toc_entries = []
    lines = text.split('\n')

    for line in lines:
        # Match lines like: "Введение.. 2" or "Создание персонажа 6"
        # Match Russian text followed by dots/spaces and a number
        # Only match if NOT indented (main chapters start at beginning of line)
        if not line.startswith(' ') and not line.startswith('\t'):
            match = re.search(r'^([А-Яа-яЁё\s]+?)[\s\.]+(\d+)\s*$', line.strip())
            if match:
                title = match.group(1).strip()
                page_num = int(match.group(2))

                # Only include if it's in our main chapters list
                for chapter_ru, chapter_en in main_chapters:
                    if chapter_ru == title:
                        toc_entries.append((title, chapter_en, page_num))
                        print(f"Found TOC entry: {title} ({chapter_en}) -> Page {page_num}")
                        break

    return toc_entries

def clean_text(text):
    """Clean extracted text"""
    # Remove page markers
    text = re.sub(r'--- PAGE \d+ ---', '', text)
    # Remove font tags
    text = re.sub(r'<[^>]+>', '', text)
    return text.strip()

def detect_and_format_tables(lines):
    """Detect tables and format them as markdown tables"""
    result = []
    i = 0

    while i < len(lines):
        # Check if we're at the start of a table
        # Tables often have a header row in all caps or mixed case
        # followed by rows of data

        # Look for patterns like: word, number pattern repeated
        if i + 5 < len(lines):  # Need at least a few lines for a table
            # Collect potential table rows
            potential_table = []
            header_line = None

            # Check if current line could be a header (multiple words/columns)
            current = lines[i].strip()

            # Skip empty lines
            if not current:
                result.append(lines[i])
                i += 1
                continue

            # Look ahead to see if we have table-like structure
            # (multiple short lines that could be cell values)
            lookahead = []
            j = i
            while j < min(i + 30, len(lines)):
                line = lines[j].strip()
                if not line:
                    break
                lookahead.append(line)
                j += 1

            # Try to detect table pattern
            # Tables often have: header words, then repeated numeric/text patterns
            table_detected = False

            # Pattern 1: Multiple consecutive short lines (likely table cells)
            if len(lookahead) > 6:
                short_lines = sum(1 for line in lookahead[:15] if len(line) < 30 and line)
                if short_lines > 8:
                    # This might be a table with cells on separate lines
                    # Try to reconstruct it
                    table_detected = True

                    # Find the header - usually starts with words
                    header_idx = 0
                    while header_idx < len(lookahead) and re.match(r'^\d+$', lookahead[header_idx]):
                        header_idx += 1

                    if header_idx < len(lookahead):
                        # Try to determine number of columns by finding patterns
                        # For now, use a simple heuristic: look for repeating structure

                        # Common pattern: header row with multiple words on one or multiple lines
                        # then rows of data

                        # Let's try to parse the table structure
                        parsed_table = parse_table_structure(lookahead)
                        if parsed_table:
                            result.append(format_markdown_table(parsed_table))
                            i = j
                            continue

            result.append(lines[i])
            i += 1
        else:
            result.append(lines[i])
            i += 1

    return result

def parse_table_structure(lines):
    """Try to parse table structure from lines"""
    # This is a simple heuristic-based parser
    # Look for repeating patterns

    # Skip leading numbers that might be page numbers
    start_idx = 0
    while start_idx < len(lines) and re.match(r'^\d+$', lines[start_idx].strip()):
        start_idx += 1

    if start_idx >= len(lines):
        return None

    # Collect header words (usually at the start)
    headers = []
    idx = start_idx

    # Headers are usually a sequence of words before the data
    # Look for capitalized words or specific patterns
    while idx < len(lines) and len(headers) < 10:
        line = lines[idx].strip()
        # If line looks like a header (word or phrase, not pure number)
        if line and not re.match(r'^[+\-]?\d+d?\d*$', line):
            # Check if it's a reasonable header
            if re.search(r'[а-яА-ЯёЁ]', line) and len(line) < 50:
                # Could be header or header continuation
                if not headers or len(line.split()) <= 3:
                    headers.append(line)
                    idx += 1
                else:
                    break
            else:
                break
        else:
            break

    # If we didn't find good headers, abort
    if len(headers) < 2:
        return None

    # Now try to find data rows
    # Data rows often have a mix of numbers and text
    rows = []
    current_row = []

    while idx < len(lines):
        line = lines[idx].strip()

        if not line:
            # Empty line might end the table
            if current_row:
                # Pad row to match header count
                while len(current_row) < len(headers):
                    current_row.append('')
                rows.append(current_row[:len(headers)])
                current_row = []
            break

        # Add to current row
        current_row.append(line)

        # Check if we have enough cells for a complete row
        if len(current_row) >= len(headers):
            rows.append(current_row[:len(headers)])
            current_row = []

        idx += 1

        # Safety limit
        if len(rows) > 50:
            break

    # Add any remaining cells
    if current_row:
        while len(current_row) < len(headers):
            current_row.append('')
        rows.append(current_row[:len(headers)])

    # Need at least one data row
    if not rows:
        return None

    return {'headers': headers, 'rows': rows}

def format_markdown_table(table):
    """Format parsed table as markdown"""
    headers = table['headers']
    rows = table['rows']

    # Create header row
    header_row = '| ' + ' | '.join(headers) + ' |'
    separator = '| ' + ' | '.join(['---' for _ in headers]) + ' |'

    # Create data rows
    data_rows = []
    for row in rows:
        # Ensure row has same number of columns as headers
        padded_row = row + [''] * (len(headers) - len(row))
        data_rows.append('| ' + ' | '.join(padded_row[:len(headers)]) + ' |')

    return '\n' + header_row + '\n' + separator + '\n' + '\n'.join(data_rows) + '\n'

def text_to_markdown(text, page_nums):
    """Convert extracted text to markdown with improved formatting"""
    lines = text.split('\n')
    md_lines = []

    # Track current page number
    current_page_idx = 0

    # Process lines
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()

        # Skip empty lines
        if not line.strip():
            md_lines.append('')
            i += 1
            continue

        stripped = line.strip()

        # Check if it's a header (all caps Russian text, relatively short)
        if re.match(r'^[А-ЯЁ\s\-]+$', stripped) and 2 <= len(stripped) <= 50:
            md_lines.append(f"## {stripped}")
            i += 1
            continue

        # Check if it's a bullet point
        if stripped.startswith('•'):
            md_lines.append(f"- {stripped[1:].strip()}")
            i += 1
            continue

        # Regular paragraph text
        md_lines.append(stripped)
        i += 1

    return '\n'.join(md_lines)

def format_markdown(text):
    """Format extracted text as proper markdown"""
    lines = text.split('\n')
    md_lines = []

    i = 0
    while i < len(lines):
        line = lines[i].rstrip()

        # Skip empty lines
        if not line.strip():
            md_lines.append('')
            i += 1
            continue

        stripped = line.strip()

        # Check if it's a header (all caps Russian text, relatively short)
        if re.match(r'^[А-ЯЁ\s\-\(\)]+$', stripped) and 2 <= len(stripped) <= 60 and not stripped.isdigit():
            md_lines.append(f"\n## {stripped}\n")
            i += 1
            continue

        # Check if it's a bullet point
        if stripped.startswith('•'):
            md_lines.append(f"- {stripped[1:].strip()}")
            i += 1
            continue

        # Regular paragraph text
        md_lines.append(stripped)
        i += 1

    return '\n'.join(md_lines)

def extract_section(doc, start_page, end_page, title):
    """Extract a section from the PDF with table detection"""
    # PDF uses 0-based indexing, but TOC uses 1-based page numbers
    # Offset calculated from: Character Creation is at book page 6, PDF page 13
    # Offset = 13 - 6 = 7

    pages_content = []
    page_nums = []

    offset = 7

    for page_idx in range(start_page - 1 + offset, ((end_page - 1 + offset + 1) if end_page else len(doc))):
        if page_idx >= len(doc):
            break
        page = doc[page_idx]

        # Try to find tables on this page
        try:
            tables = page.find_tables()
            table_data = []

            if tables and tables.tables:
                for table in tables.tables:
                    # Extract table as pandas dataframe or dict
                    try:
                        df = table.to_pandas()
                        if df is not None and not df.empty:
                            table_data.append({
                                'bbox': table.bbox,
                                'data': df
                            })
                    except:
                        pass
        except:
            tables = None
            table_data = []

        # Get text
        text = page.get_text()
        cleaned = clean_text(text)

        # If we found tables, try to replace them in the text
        if table_data:
            content = format_markdown_with_tables(cleaned, table_data)
        else:
            content = format_markdown(cleaned)

        # Add page marker and content
        pages_content.append(f"<!-- PDF Page {page_idx + 1} -->\n\n{content}")
        page_nums.append(page_idx + 1)

    return '\n\n'.join(pages_content), page_nums

def format_markdown_with_tables(text, table_data):
    """Format markdown with extracted tables"""
    # For now, just append tables at the end
    # A more sophisticated approach would be to insert them at the right position
    result = format_markdown(text)

    for table_info in table_data:
        df = table_info['data']
        # Convert dataframe to markdown table
        md_table = '\n' + df.to_markdown(index=False) + '\n'
        result += '\n' + md_table

    return result

def parse_pdf():
    """Main parsing function"""
    if not os.path.exists(PDF_PATH):
        print(f"Error: PDF not found at {PDF_PATH}")
        return

    print(f"Opening PDF: {PDF_PATH}")
    doc = fitz.open(PDF_PATH)
    print(f"Total pages: {len(doc)}\n")

    # Extract TOC
    toc_entries = extract_toc(doc)

    if not toc_entries:
        print("No TOC entries found. Please check the PDF structure.")
        return

    print(f"\nFound {len(toc_entries)} TOC entries\n")

    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Group chapters and determine file structure
    chapters_to_extract = []

    i = 0
    while i < len(toc_entries):
        title_ru, title_en, start_page = toc_entries[i]

        # Group the three classes together
        if title_en in ["Fighter", "Specialist", "Mystic"]:
            if title_en == "Fighter":
                # Combine all three classes
                fighter_page = start_page
                specialist_page = toc_entries[i + 1][2] if i + 1 < len(toc_entries) else None
                mystic_page = toc_entries[i + 2][2] if i + 2 < len(toc_entries) else None

                # Find the next chapter after Mystic
                next_chapter_idx = i + 3
                end_page = toc_entries[next_chapter_idx][2] - 1 if next_chapter_idx < len(toc_entries) else None

                chapters_to_extract.append({
                    "filename": "03_Classes.md",
                    "title": "Classes",
                    "start_page": fighter_page,
                    "end_page": end_page
                })
                i += 3  # Skip Fighter, Specialist, Mystic
                continue
            else:
                # Skip Specialist and Mystic as they're handled with Fighter
                i += 1
                continue

        # Determine filename based on title_en
        file_mapping = {
            "Introduction": "01_Introduction.md",
            "Character Creation": "02_Character_Creation.md",
            "Skills": "04_Skills.md",
            "Special Traits": "05_Special_Traits.md",
            "Equipment": "06_Equipment.md",
            "Combat": "07_Combat.md",
            "Adventures": "08_Adventures.md",
            "Mysteries": "09_Mysteries.md",
            "Bestiary": "10_Bestiary.md",
        }

        filename = file_mapping.get(title_en, f"{i:02d}_{title_en.replace(' ', '_')}.md")

        # Calculate end page
        end_page = toc_entries[i + 1][2] - 1 if i + 1 < len(toc_entries) else None

        chapters_to_extract.append({
            "filename": filename,
            "title": title_en,
            "start_page": start_page,
            "end_page": end_page
        })

        i += 1

    # Also add TOC itself (use special marker for PDF page, not book page)
    chapters_to_extract.insert(0, {
        "filename": "00_Table_of_Contents.md",
        "title": "Table of Contents",
        "start_page": -1,  # Special marker for TOC
        "end_page": -1,
        "pdf_page": 6  # Direct PDF page index
    })

    # Extract and save each section
    for chapter in chapters_to_extract:
        filename = chapter["filename"]
        title = chapter["title"]
        start_page = chapter["start_page"]
        end_page = chapter["end_page"]

        # Handle special case for TOC
        if "pdf_page" in chapter:
            print(f"Extracting: {title} (PDF page {chapter['pdf_page'] + 1})")
            page = doc[chapter["pdf_page"]]
            text = page.get_text()
            content = f"<!-- PDF Page {chapter['pdf_page'] + 1} -->\n\n{format_markdown(clean_text(text))}"
            page_nums = [chapter['pdf_page'] + 1]
        else:
            print(f"Extracting: {title} (pages {start_page}-{end_page or 'end'})")
            content, page_nums = extract_section(doc, start_page, end_page, title)

        output_path = os.path.join(OUTPUT_DIR, filename)

        # Create markdown content (page markers are already in content from extract_section)
        md_content = f"# {title}\n\n{content}"

        # Save
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(md_content)

        print(f"  Saved to: {output_path}\n")

    doc.close()
    print("Done!")

if __name__ == "__main__":
    parse_pdf()
