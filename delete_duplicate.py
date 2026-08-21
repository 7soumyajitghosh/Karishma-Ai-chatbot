import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Let's find the start of the second `accountView === "forgot"` block and the end of the `accountView === "reset"` block.
matches = list(re.finditer(r'\{accountView === "forgot" && \(', content))
if len(matches) > 1:
    start_index = matches[1].start()
    # Now find the end of the second `accountView === "reset"` block
    # It ends with `)}` and then there's `{accountView === "verify"`
    end_match = re.search(r'\{accountView === "verify"', content[start_index:])
    if end_match:
        end_index = start_index + end_match.start()
        # Find the last `)}` before end_match
        last_paren_match = list(re.finditer(r'\)\}', content[start_index:end_index]))
        if last_paren_match:
            true_end_index = start_index + last_paren_match[-1].end()
            
            # Remove from start_index to true_end_index
            new_content = content[:start_index] + content[true_end_index:]
            
            with open("src/App.tsx", "w") as f:
                f.write(new_content)
            print("Duplicate removed successfully.")
        else:
            print("Could not find the end of the block.")
    else:
        print("Could not find verify block after the second forgot block.")
else:
    print("Only one forgot block found.")

