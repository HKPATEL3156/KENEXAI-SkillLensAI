# library for gemini sdk
from google import genai  # import gemini sdk

# library for json
import json  # handle json safely

# your api key (replace with your new key)
api_key = "AIzaSyBZmJfhqrmddD0KivcpgvrL0UsBvmPf0ec"  # set api key
# api_key = "AIzaSyCNGKrO0pG6x8EIFSYPfXBeLJSLjg9l3ms"  # set api key

# create gemini client
client = genai.Client(api_key=api_key)  # create client

# skill list
# skills = ["html","css","javascript","react","nodejs","express","mongodb","rest api","git"]  # skills
# ask form the user
skills_input = input("Enter comma-separated skills to evaluate (e.g. html, css, javascript): ")  # get user input
skills = [skill.strip() for skill in skills_input.split(",")]  # split and clean


# convert skill list into string
skill_text = ", ".join(skills)  # join skills into text

# create prompt (no f-string to avoid bracket error)
prompt = """
Skills to evaluate for juniour developers or freshers:
""" + skill_text + """

Rules:

- Generate exactly 25 questions.

- Difficulty distribution:
  • 30% Easy (concept clarity)
  • 40% Medium (practical logic)
  • 30% Hard (scenario + edge cases)

- Question type distribution:
  • Minimum 50% MSQ
  • Remaining MCQ
  • At least 40% must include short code snippet
  • At least 40% must be scenario-based

- Question style:
  • Mix conceptual, debugging, output prediction, best practice, and real-world mistake detection
  • Avoid direct definition-based questions
  • Avoid extremely advanced or rare topics
  • Focus on commonly used development patterns
  • Code snippets must be short (max 8–10 lines)
  • Include tricky edge cases where applicable
  • also you can ask the multiple skill question with real senario type 
  

- Evaluation focus:
  • Logical reasoning
  • Common developer mistakes
  • Runtime behavior
  • Performance awareness
  • Security awareness (basic level)
  • Clean code practices

- Each question text maximum 3 lines (excluding code)

- No explanations.
- No answers outside JSON.
- Must generate complete 25 questions without truncation.

Output format:
Return ONLY a valid JSON array of exactly 25 objects.

Each object must contain:
id (number 1 to 25)
text (question text max 3 lines)
code (short code snippet or null)
type (MCQ or MSQ)
options (object with keys A,B,C,D)
correct (array of correct option letters)
difficulty (easy or medium or hard)

Generate complete 25 questions fully without stopping.
"""

try:
    # call gemini model
    response = client.models.generate_content(
        model="gemini-2.5-flash",  # stable fast model
        contents=prompt,
        config={
            "temperature": 0.4,        # controlled creativity
            "max_output_tokens": 15000 # enough tokens for 25 questions
        }
    )

    # get raw text
    raw_text = response.text  # get model output

    print("generated_quiz_raw:\n")  # label
    print(raw_text)  # print raw response

    # try converting to json
    try:
        quiz_json = json.loads(raw_text)  # convert to json

        print("\njson_valid:\n")  # label
        print("total_questions:", len(quiz_json))  # count questions

    except Exception as je:
        print("\njson_parse_error:\n")  # label
        print(str(je))  # show json error

except Exception as e:
    print("api_error:\n")  # label
    print(str(e))  # show api error