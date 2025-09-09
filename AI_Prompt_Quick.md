# NeuralCard AI Prompt - Quick Reference

## Generate flashcards for: **[TOPIC]**

**Instructions for AI:**
Create 8-15 flashcards using NeuralCard format. Mix card types, include LaTeX math where relevant, use comprehensive tags, and provide detailed explanations.

**Required Format:**
```markdown
<!-- Anki Card -->
<!-- type: [basic|cloze|multiple-choice|true-false|fill-in-the-blank|reversed|image-occlusion|audio] -->
<!-- front -->
[Question/Content]

<!-- back -->
[Answer/Explanation]
<!-- tags: subject, topic, subtopic -->
```

**Card Types:**
- `basic`: Simple Q&A
- `cloze`: Use `{{text}}` for hidden parts
- `multiple-choice`: Options with `<!-- correct -->` marker
- `true-false`: With `<!-- correct_answer: True/False -->`
- `fill-in-the-blank`: Blanks converted to cloze
- `reversed`: Terms and definitions
- `image-occlusion`: Images with masked areas
- `audio`: Audio content with `[audio:filename.mp3]`

**Math Support:** `$inline$` and `$$display$$` LaTeX
**Multiple Cards:** Separate with `---`
**Tags:** Comma-separated, descriptive terms

**Example Output:**
```markdown
<!-- Anki Card -->
<!-- type: cloze -->
<!-- front -->
The {{mitochondria}} is the {{powerhouse}} of the cell.
<!-- tags: biology, cell, organelles -->

---

<!-- Anki Card -->
<!-- type: multiple-choice -->
<!-- front -->
Which planet is closest to the Sun?

<!-- options -->
Venus
Earth
Mercury <!-- correct -->
Mars

<!-- back -->
Mercury is the closest planet to the Sun, with an average distance of about 58 million kilometers.
<!-- tags: astronomy, planets, solar-system -->
```</content>
<parameter name="filePath">/run/media/sapienskid/BackUP/Second Brain/.obsidian/plugins/flashcard_maker/AI_Prompt_Quick.md