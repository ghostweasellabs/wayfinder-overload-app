#!/usr/bin/env python3
"""
Extract form fields from WayFinder Expedition Log PDF
"""
import json
import sys
import re
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("Error: pdfplumber not installed. Run: uv pip install pdfplumber")
    sys.exit(1)

def sanitize_field_name(text):
    """Convert text to a valid field name"""
    # Remove special characters, keep alphanumeric and spaces
    name = re.sub(r'[^\w\s-]', '', text)
    # Replace spaces and dashes with underscores
    name = re.sub(r'[\s-]+', '_', name)
    # Remove multiple underscores
    name = re.sub(r'_+', '_', name)
    # Remove leading/trailing underscores and convert to lowercase
    name = name.strip('_').lower()
    # Limit length
    if len(name) > 50:
        name = name[:50]
    return name or 'field'

def determine_field_type(label):
    """Determine field type based on label"""
    label_lower = label.lower()
    
    # Only actual date fields (not fields that happen to contain the word)
    if 'date / day' in label_lower or (label_lower.startswith('date') and 'day' in label_lower):
        return 'date'
    # Textarea fields (multi-line content)
    elif any(word in label_lower for word in ['notes', 'observations', 'summary', 'objectives', 'lessons', 'challenges', 'journal', 'cohesion', 'friction', 'breakthroughs', 'reactions', 'decisions', 'growth', 'action items', 'next steps', 'environmental observations', 'end-of-day', 'sketch', 'map', 'terrain event', 'lat/lon', 'position']):
        return 'textarea'
    # Number fields
    elif any(word in label_lower for word in ['odo', 'dist', 'fuel', 'mpg', 'psi', 'temp', 'wind', 'radio', 'sunrise', 'sunset']):
        return 'number'
    else:
        return 'text'

def extract_fields_from_pdf(pdf_path):
    """Extract all form fields from PDF based on actual content"""
    fields = []
    seen_labels = set()
    
    # Define known field patterns from the PDF
    known_fields = [
        # Page 1 - Main Log
        "Date / Day # / Region–Route",
        "Route & Fuel Data",
        "Odo Start",
        "Odo End", 
        "Dist",
        "Fuel Start",
        "Fuel End",
        "MPG",
        "Tire PSI",
        "Expedition Leader",
        "WX / Temp / Wind / Radio Ch.",
        "Team & Roles",
        "Name",
        "Role",
        "E",
        "M",
        "Notes",
        "Objectives (Today)",
        "Time Position (Lat/Lon) Terrain Event / Action",
        "Sketch / Map Box",
        "Notes / Observations",
        "End-of-Day Summary",
        "Top 3 Lessons Learned",
        "Next-Day Objectives",
        "Equipment / Vehicles to Inspect",
        "Distance Today",
        "Drive / Stop Time",
        "Recoveries",
        "Lessons Learned",
        
        # Page 2 - Environmental & Maintenance
        "Weather Trends (M / MD / E)",
        "Temp",
        "Wind",
        "Sky",
        "Precip",
        "Terrain Type Tracker",
        "Sand",
        "Rock",
        "Mud",
        "Water",
        "Snow",
        "Forest",
        "Gravel",
        "Vehicle Maintenance Checkpoints",
        "Oil",
        "Coolant",
        "Brakes",
        "Tires",
        "Suspension",
        "Lights",
        "Winch",
        "Recovery Gear",
        "Electrics",
        "Environmental Observations",
        "Action Items / Next Steps",
        "Light Data",
        "Sunrise",
        "Sunset",
        
        # Page 2 - Leadership & Reflection
        "Leadership Challenges Faced Today",
        "Team Cohesion Notes (Trust, Friction, Breakthroughs)",
        "Self-Awareness Journal (Reactions, Decisions, Growth)",
        "Lessons to Carry Forward",
    ]
    
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            text = page.extract_text()
            
            if text:
                lines = text.split('\n')
                
                for line in lines:
                    line = line.strip()
                    if not line or len(line) < 2:
                        continue
                    
                    # Skip headers
                    if ('WAYFINDER' in line.upper() or 
                        'EXPEDITION LOG' in line.upper() or
                        'THE WAY FORWARD' in line.upper() or
                        line.startswith('Page')):
                        continue
                    
                    # Check if this line matches any known field
                    label = None
                    for known_field in known_fields:
                        # Check if the known field appears in this line
                        if known_field.lower() in line.lower() or line.lower() in known_field.lower():
                            # Extract the actual label from the line
                            if ':' in line:
                                label = line.split(':')[0].strip()
                            else:
                                label = line
                            
                            # Clean up label
                            label = re.sub(r'\s+', ' ', label).strip()
                            
                            if label and label not in seen_labels:
                                seen_labels.add(label)
                                field_type = determine_field_type(label)
                                
                                fields.append({
                                    'name': sanitize_field_name(label),
                                    'label': label,
                                    'type': field_type,
                                    'page': page_num
                                })
                            break
                    
                    # Also extract fields that end with colon (common pattern)
                    if not label and ':' in line:
                        parts = line.split(':', 1)
                        potential_label = parts[0].strip()
                        
                        # Skip if it's too long (probably not a label)
                        if len(potential_label) < 60 and potential_label not in seen_labels:
                            # Check if it looks like a field label
                            if (not potential_label.isdigit() and 
                                len(potential_label) > 2 and
                                not potential_label.startswith('Wayfinder')):
                                
                                seen_labels.add(potential_label)
                                field_type = determine_field_type(potential_label)
                                
                                fields.append({
                                    'name': sanitize_field_name(potential_label),
                                    'label': potential_label,
                                    'type': field_type,
                                    'page': page_num
                                })
    
    # Remove duplicates and sort
    unique_fields = []
    seen_names = set()
    for field in fields:
        if field['name'] not in seen_names:
            seen_names.add(field['name'])
            unique_fields.append(field)
    
    return unique_fields

def generate_field_config(pdf_path, output_path):
    """Generate field configuration JSON from PDF"""
    fields = extract_fields_from_pdf(pdf_path)
    
    config = {
        'fields': fields,
        'metadata': {
            'source': str(pdf_path),
            'total_fields': len(fields)
        }
    }
    
    with open(output_path, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"Extracted {len(fields)} fields from PDF")
    print(f"Configuration saved to {output_path}")
    
    return config

if __name__ == '__main__':
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    pdf_path = project_root / 'docs' / 'WayFinder_Expedition_Log_v3_1_Print_Test.pdf'
    output_path = project_root / 'field-config.json'
    
    if not pdf_path.exists():
        print(f"Error: PDF not found at {pdf_path}")
        sys.exit(1)
    
    generate_field_config(pdf_path, output_path)
