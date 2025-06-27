import re
import os
import sys

def split_ts_file_by_function(input_file_path: str, output_directory: str):
    """
    Reads a TypeScript file, extracts top-level function declarations,
    and writes each function to a new .ts file named after the function.

    Args:
        input_file_path (str): The path to the input TypeScript file.
        output_directory (str): The directory where the new .ts files will be saved.
    """
    if not os.path.exists(input_file_path):
        print(f"Error: Input file not found at '{input_file_path}'")
        return

    if not os.path.isdir(output_directory):
        print(f"Creating output directory: '{output_directory}'")
        os.makedirs(output_directory)

    try:
        with open(input_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading input file: {e}")
        return

    # Regex to find potential function declaration starts.
    # This pattern aims to capture the full signature up to the opening brace,
    # and extract the function name.
    # Group 1: 'function', Group 2: function name (for standard functions)
    # Group 3: 'const', 'let', 'var', Group 4: variable name (for arrow functions/expressions)
    function_declaration_pattern = re.compile(
        # Matches 'export function name(...) {', 'async function name(...) {'
        r'^(?:export\s+)?(?:async\s+)?(function)\s+([a-zA-Z_$][\w$]*)\s*\(.*?\)\s*'
        # OR Matches 'export const name = (...) => {', 'const name = function(...) {'
        r'|^(?:export\s+)?(const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:function)?\s*\(.*?\)\s*=>\s*',
        re.MULTILINE # Allows '^' to match the start of a line, not just the string
    )

    found_functions = [] # Stores (function_name, function_content) tuples

    current_search_index = 0
    while current_search_index < len(content):
        # Search for the next function declaration starting from current_search_index
        match = function_declaration_pattern.search(content, current_search_index)
        if not match:
            break # No more function declarations found

        func_name = None
        # Determine the function name based on which group matched
        if match.group(1): # It's a standard 'function' declaration
            func_name = match.group(2)
        elif match.group(3): # It's a 'const|let|var' declaration (arrow function or function expression)
            func_name = match.group(4)

        if not func_name:
            # This should ideally not happen if regex is correct, but as a safeguard
            print(f"Warning: Could not extract function name from match starting at index {match.start()}. Skipping.")
            current_search_index = match.end()
            continue

        # Find the actual opening brace '{' for the function body after the signature
        # We start searching from where the current regex match ended.
        body_start_index = content.find('{', match.end())
        if body_start_index == -1:
            print(f"Warning: Could not find opening brace for function '{func_name}' starting near index {match.start()}. Skipping.")
            current_search_index = match.end() # Move past this problematic match
            continue

        brace_count = 1 # We've found the first opening brace for the function body
        body_end_index = body_start_index + 1 # Start checking from the character after the opening brace

        # Iterate through the content to find the matching closing brace
        # This is a naive brace counter and does not account for braces within strings or comments.
        while body_end_index < len(content) and brace_count > 0:
            char = content[body_end_index]
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
            body_end_index += 1

        if brace_count == 0:
            # We found the end of the function body.
            # The function content includes everything from the start of the declaration
            # (where 'match.start()' points) up to and including the closing brace.
            function_content = content[match.start():body_end_index]
            found_functions.append((func_name, function_content))
            current_search_index = body_end_index # Continue searching from after this extracted function
        else:
            # This indicates mismatched braces, likely due to a parsing issue or malformed code.
            print(f"Warning: Mismatched braces for function '{func_name}' starting near index {match.start()}. "
                  f"Function content might be incomplete. Skipping to next potential function.")
            current_search_index = match.end() # Move past this problematic match

    if not found_functions:
        print(f"No top-level functions found in '{input_file_path}'.")
        return

    # Write each extracted function to its own file
    for func_name, func_content in found_functions:
        output_file_path = os.path.join(output_directory, f"{func_name}.ts")
        try:
            with open(output_file_path, 'w', encoding='utf-8') as f:
                f.write(func_content)
            print(f"Successfully created: {output_file_path}")
        except Exception as e:
            print(f"Error writing file '{output_file_path}': {e}")

# Example Usage (replace with your actual file paths)
if __name__ == "__main__":
    # --- Configuration ---
    # The path to your input TypeScript file
    input_ts_file = "src/utils/dom-manipulation/all.ts" # <--- IMPORTANT: Change this to your file path!

    # The directory where you want the new function files to be saved
    output_dir_name = "src/utils/dom-manipulation/" # This directory will be created if it doesn't exist
    # ---------------------

    print(f"Attempting to split functions from '{input_ts_file}' into '{output_dir_name}' directory.")
    split_ts_file_by_function(input_ts_file, output_dir_name)
    print("\nScript finished.")

