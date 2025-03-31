# Flashcard Maker - Formatting Guide

This guide explains how to format your notes in Obsidian to create flashcards using the Flashcard Maker plugin. Each flashcard type has specific formatting requirements that allow the plugin to convert your notes into Anki-compatible cards.

## Table of Contents
1. [Basic Flashcards](#basic-flashcards)
2. [Cloze Deletions](#cloze-deletions)
3. [Multiple Choice Questions](#multiple-choice-questions)
4. [True/False Questions](#trueFalse-questions)
5. [Fill-in-the-blank Cards](#fill-in-the-blank-cards)
6. [Image Occlusion Cards](#image-occlusion-cards)
7. [Reversed Cards](#reversed-cards)
8. [Audio Cards](#audio-cards)
9. [Tagging Flashcards](#tagging-flashcards)
10. [Math/LaTeX Support](#mathlatex-support)
11. [Separating Flashcards](#separating-flashcards)

## Basic Flashcards <a name="basic-flashcards"></a>

Basic flashcards have a front side (question) and a back side (answer). Use HTML comments to denote the beginning of a card and its different sections.

```markdown
<!-- Anki Card -->
<!-- type: basic -->
<!-- front -->
What is the capital of France?

<!-- back -->
Paris
<!-- tags: geography, europe -->
```

## Cloze Deletions <a name="cloze-deletions"></a>

Cloze deletions hide parts of text that need to be remembered. Mark cloze deletions with double curly braces `{{ }}`. The plugin will automatically convert these to Anki's cloze format `{{c1::text}}`.

```markdown
<!-- Anki Card -->
<!-- type: cloze -->
<!-- front -->
The {{mitochondria}} is the powerhouse of the cell.
<!-- tags: biology, cell -->
```

You can have multiple cloze deletions in a single card. Each one will be numbered automatically:

```markdown
<!-- Anki Card -->
<!-- type: cloze -->
<!-- front -->
{{DNA}} is found in the {{nucleus}} of eukaryotic cells.
<!-- tags: biology, cell -->
```

## Multiple Choice Questions <a name="multiple-choice-questions"></a>

For multiple-choice questions, specify the question, options, and which option is correct.

```markdown
<!-- Anki Card -->
<!-- type: multiple-choice -->
<!-- front -->
Which planet is known as the Red Planet?

<!-- options -->
Venus
Mars <!-- correct -->
Jupiter
Saturn

<!-- back -->
Mars is often called the Red Planet due to the iron oxide prevalent on its surface, which gives it a reddish appearance.
<!-- tags: astronomy, planets -->
```

You can also use `<!-- type: mcq -->` instead of `<!-- type: multiple-choice -->`.

## True/False Questions <a name="trueFalse-questions"></a>

Create true/false questions with a question and a correct answer of either "True" or "False".

```markdown
<!-- Anki Card -->
<!-- type: true-false -->
<!-- front -->
The Great Wall of China is visible from space with the naked eye.

<!-- back -->
False. It's a common misconception. The Great Wall is hardly visible from low Earth orbit, and certainly not visible from the Moon.
<!-- correct_answer: False -->
<!-- tags: history, misconceptions -->
```

## Fill-in-the-blank Cards <a name="fill-in-the-blank-cards"></a>

These cards are similar to cloze deletions but allow for specific expected answers.

```markdown
<!-- Anki Card -->
<!-- type: fill-in-the-blank -->
<!-- front -->
The process by which plants make their own food using sunlight is called ____________.

<!-- back -->
photosynthesis
<!-- tags: biology, plants -->
```

When there are multiple acceptable answers, separate them with commas:

```markdown
<!-- Anki Card -->
<!-- type: fill-in-the-blank -->
<!-- front -->
The largest organ in the human body is the ____________.

<!-- back -->
skin, integumentary system
<!-- tags: anatomy, human body -->
```

## Image Occlusion Cards <a name="image-occlusion-cards"></a>

Image occlusion cards allow you to hide parts of an image that need to be remembered.

```markdown
<!-- Anki Card -->
<!-- type: image-occlusion -->
<!-- front -->
![Anatomy Chart](attachments/anatomy_chart.png)

<!-- masked-areas -->
[100, 150, 80, 30]
[210, 300, 90, 40]

<!-- back -->
The masked areas are the heart and the lungs.
<!-- tags: anatomy, organs -->
```

The format for masked areas is `[left, top, width, height]` in pixels.

## Reversed Cards <a name="reversed-cards"></a>

Reversed cards are like basic cards but with the front and back sides swapped when reviewing.

```markdown
<!-- Anki Card -->
<!-- type: reversed -->
<!-- front -->
Photosynthesis

<!-- back -->
The process by which plants convert sunlight into energy
<!-- tags: biology, processes -->
```

## Audio Cards <a name="audio-cards"></a>

For cards with audio content, you can include audio files using a special syntax.

```markdown
<!-- Anki Card -->
<!-- type: audio -->
<!-- front -->
Listen and identify the musical instrument:
[audio:violin_sample.mp3]

<!-- back -->
Violin
<!-- tags: music, instruments -->
```

You can also use `[sound:filename.mp3]` syntax.

## Tagging Flashcards <a name="tagging-flashcards"></a>

Tags help organize your flashcards. Add tags using the format:

```markdown
<!-- tags: tag1, tag2, tag3 -->
```

Tags should be placed at the end of each card and are comma-separated.

## Math/LaTeX Support <a name="mathlatex-support"></a>

The plugin supports LaTeX for mathematical expressions, using standard Markdown LaTeX syntax:

```markdown
<!-- Anki Card -->
<!-- type: basic -->
<!-- front -->
Solve: $x^2 + 5x + 6 = 0$

<!-- back -->
$x = -2$ or $x = -3$

This can be verified:
$(-2)^2 + 5(-2) + 6 = 4 - 10 + 6 = 0$
$(-3)^2 + 5(-3) + 6 = 9 - 15 + 6 = 0$
<!-- tags: math, algebra -->
```

For cloze deletions with LaTeX, you can include LaTeX within the cloze markers:

```markdown
<!-- Anki Card -->
<!-- type: cloze -->
<!-- front -->
The quadratic formula is $x = \frac{-b \pm {{sqrt{b^2 - 4ac}}}}{2a}$
<!-- tags: math, formulas -->
```

## Separating Flashcards <a name="separating-flashcards"></a>

When creating multiple flashcards in a single note, separate each flashcard with three dashes `---` (a horizontal rule in Markdown). This helps the plugin identify where one card ends and another begins.

```markdown
<!-- Anki Card -->
<!-- type: basic -->
<!-- front -->
What is the capital of France?

<!-- back -->
Paris
<!-- tags: geography, europe -->

---

<!-- Anki Card -->
<!-- type: basic -->
<!-- front -->
What is the capital of Italy?

<!-- back -->
Rome
<!-- tags: geography, europe -->
```

Each flashcard should begin with `<!-- Anki Card -->` and should be separated from other flashcards using the `---` separator.

## Complete Example

Here's a complete example showing multiple cards in a single note with proper separation:

```markdown
# Study Notes

<!-- Anki Card -->
<!-- type: basic -->
<!-- front -->
What are the two main types of cells?

<!-- back -->
1. Prokaryotic cells
2. Eukaryotic cells
<!-- tags: biology, cells, basics -->

---

<!-- Anki Card -->
<!-- type: cloze -->
<!-- front -->
{{Prokaryotic}} cells do not have a nucleus, while {{eukaryotic}} cells do have a nucleus.
<!-- tags: biology, cells, comparison -->

---

<!-- Anki Card -->
<!-- type: multiple-choice -->
<!-- front -->
Which of these is NOT a eukaryotic cell?

<!-- options -->
Human skin cell
Plant cell
Bacteria <!-- correct -->
Animal cell

<!-- back -->
Bacteria are prokaryotic cells, which lack a nucleus and other membrane-bound organelles.
<!-- tags: biology, cells, classification -->
```

Remember that each card begins with `<!-- Anki Card -->`, includes the card type, front content, back content, and tags, and is separated from other cards using the `---` separator.