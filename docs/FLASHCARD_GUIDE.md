# Obsidian Flashcard Maker - User Guide

This guide explains how to format your Markdown notes to create Anki flashcards with the Flashcard Maker plugin.

## Table of Contents
- [Basic Structure](#basic-structure)
- [Card Types](#card-types)
  - [Basic Cards](#basic-cards)
  - [Cloze Deletion Cards](#cloze-deletion-cards)
  - [Fill-in-the-Blank Cards](#fill-in-the-blank-cards)
  - [Multiple Choice Cards](#multiple-choice-cards)
  - [True/False Cards](#truefalse-cards)
  - [Reversed Cards](#reversed-cards)
  - [Math/LaTeX Cards](#mathlatex-cards)
  - [Code Cards](#code-cards)
  - [Audio Cards](#audio-cards)
  - [Matching Cards](#matching-cards)
  - [Ordering Cards](#ordering-cards)

## Basic Structure

Each flashcard is separated by a triple dash (`---`) and contains at least:
- A card type marker
- Front content
- Back content
- Optional tags

Example:

<!-- type: basic --> <!-- front -->
What is the capital of France?

<!-- back -->
Paris

<!-- tags: geography, europe -->

## Card Types

### Basic Cards

Standard question and answer format.
<!-- type: basic --> <!-- front -->
What is the capital of France?

<!-- back -->
Paris

<!-- tags: geography, europe -->

### Cloze Deletion Cards

Text with certain parts hidden. Two ways to create cloze cards:

**Using {{text}} syntax:**
<!-- type: cloze --> <!-- front -->
The three branches of the US government are {{Legislative}}, {{Executive}}, and {{Judicial}}.

<!-- back -->
The legislative branch makes laws, the executive branch enforces laws, and the judicial branch interprets laws.

<!-- tags: politics, government -->

**Using {{c1::text}} syntax for more control:**
<!-- type: cloze --> <!-- front -->
Mitochondria are {{c1::the powerhouse}} of {{c2::the cell}}.

<!-- back -->
Additional information about mitochondria.

<!-- tags: biology, cells -->

### Fill-in-the-Blank Cards

Special version of cloze cards with blanks represented by five underscores (`_____`).
<!-- type: fill-in-the-blank --> <!-- front -->
Water consists of _____ and oxygen.

<!-- back -->
hydrogen

<!-- tags: chemistry, elements -->

For multiple blanks, separate answers with commas:
<!-- type: fill-in-the-blank --> <!-- front -->
In the quadratic formula x = (-b ± _____)/(2a), the discriminant _____ determines the number of solutions.

<!-- back -->
√(b²-4ac), b²-4ac

<!-- tags: math, algebra -->

### Multiple Choice Cards

Questions with multiple choices where one is correct.
<!-- type: multiple-choice --> <!-- front -->
Which planet is known as the Red Planet?

<!-- options -->
Mars <!-- correct --> 
Venus 
Jupiter 
Mercury

<!-- back -->
Mars is called the Red Planet due to its reddish appearance.

<!-- tags: astronomy, planets -->

### True/False Cards

Simple true or false statements.
<!-- type: true-false --> <!-- front -->
The Earth is flat.

<!-- answer: false --> <!-- back -->
The Earth is approximately spherical in shape.

<!-- tags: geography, science -->

### Reversed Cards

Create cards where the back becomes the front and vice versa.
<!-- type: reversed --> <!-- front -->
Photosynthesis

<!-- back -->
The process by which plants convert light energy into chemical energy.

<!-- tags: biology, plants -->

### Math/LaTeX Cards

Cards with mathematical formulas using LaTeX.
<!-- type: basic --> <!-- front -->
What is the formula for the area of a circle?

<!-- back -->
$A = \pi r^2$

Where:

$A$ is the area
$r$ is the radius
<!-- tags: math, geometry -->

For cloze deletion with LaTeX:
<!-- type: cloze --> <!-- front -->
The quadratic formula is: $x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$

The expression inside the square root ($b^2-4ac$) is called the {{discriminant}}.

<!-- back -->
The discriminant determines the number of solutions:

If $b^2-4ac > 0$, there are two distinct real solutions
If $b^2-4ac = 0$, there is one real solution
If $b^2-4ac < 0$, there are two complex solutions
<!-- tags: math, algebra -->

For LaTeX with embedded cloze markers:
<!-- type: cloze --> <!-- front -->
The quadratic formula is: $x = \frac{-b \pm {c1::\sqrt{b^2-4ac}}}{2a}$

<!-- back -->
The discriminant $b^2-4ac$ determines the number of real solutions.

<!-- tags: mathematics, algebra -->

### Code Cards

Cards with code snippets. Use standard Markdown code blocks.
<!-- type: basic --> <!-- front -->
What is the output of the following Python code?

```
def greet(name):
    return f"Hello, {name}!"
    
print(greet("World"))
```
<!-- back -->
Hello, World!
<!-- tags: programming, python -->

Fill-in-the-blank with code:
<!-- type: fill-in-the-blank --> <!-- front -->
Complete the following C++ function to calculate factorial:
```
int factorial(int n) {
    if (n <= 1) {
        return _____;
    }
    return n * ____________;
}
```
<!-- back -->
1, factorial(n-1)

<!-- tags: programming, c++, recursion -->


### Audio Cards

Cards with audio content.
<!-- type: audio --> <!-- front -->
Listen and identify the language:

[audio:spanish_sample.mp3]

<!-- back -->
Spanish

<!-- tags: languages, listening -->

### Matching Cards

Cards where items need to be matched.
<!-- type: matching --> <!-- front -->
Match the chemical elements with their symbols:

Hydrogen -> H
Oxygen -> O
Carbon -> C
Nitrogen -> N
<!-- back --> 
These are some common elements and their symbols from the periodic table.
<!-- tags: chemistry, elements -->

### Ordering Cards

Cards where items need to be put in correct order.
<!-- type: ordering --> 
<!-- front -->
Put these events in chronological order:

World War II
The Renaissance
Ancient Rome
Moon Landing
<!-- back --> 
Correct order:
Ancient Rome
The Renaissance
World War II
Moon Landing
<!-- tags: history, events -->

## Additional Features

### Adding Images
<!-- type: basic --> <!-- front -->
Identify this landmark:

Eiffel Tower

<!-- back -->
The Eiffel Tower in Paris, France

<!-- tags: geography, landmarks -->

# Obsidian Flashcard Maker - Format Guide

## Card Styles

The plugin supports several built-in card styles that can be selected in settings:

1. **Modern (Default)**
   - Clean, minimalist design
   - High readability
   - Subtle shadows and transitions

2. **Retro**
   - Classic index card appearance
   - Serif fonts
   - Paper texture background

3. **Minimal**
   - No decorative elements
   - Maximum focus on content
   - High contrast

4. **Bauhaus**
   - Geometric shapes
   - Primary colors
   - Sans-serif typography

5. **Brutalist**
   - Bold typography
   - Raw, undecorated design
   - High contrast elements

6. **Contemporary**
   - Modern typography
   - Subtle gradients
   - Rounded corners

7. **Colorful**
   - Vibrant color scheme
   - Playful design elements
   - Dynamic transitions

## Basic Card Structure

Each card requires specific HTML comments to mark its structure:

```markdown
<!-- type: basic --> <!-- front -->
Question text here

<!-- back -->
Answer text here

<!-- tags: tag1, tag2 -->
```

## Supported Card Types

### Basic Cards
```markdown
<!-- type: basic --> <!-- front -->
What is the capital of France?

<!-- back -->
Paris

<!-- tags: geography, europe -->
```

### Cloze Cards
```markdown
<!-- type: cloze --> <!-- front -->
The {{capital}} of France is Paris.

<!-- back -->
Additional information here.

<!-- tags: geography -->
```

### Fill-in-the-Blank
```markdown
<!-- type: fill-in-the-blank --> <!-- front -->
The capital of France is _____.

<!-- back -->
Paris

<!-- tags: geography -->
```

## Custom Styling

You can add custom CSS in the plugin settings:

```css
.flashcard {
    /* Your custom styles */
}

.flashcard-front {
    /* Front-specific styles */
}

.flashcard-back {
    /* Back-specific styles */
}
```

## Media Support

### Images
```markdown
<!-- type: basic --> <!-- front -->
![Image description](image.jpg)

<!-- back -->
Answer text
```

### Code Blocks
```markdown
<!-- type: basic --> <!-- front -->
What does this code output?

```python
print("Hello, World!")
```

<!-- back -->
Hello, World!
```

## Card Organization

### Tags
- Use comma-separated tags: `<!-- tags: tag1, tag2, tag3 -->`
- Tags are optional but recommended for organization

### Decks
- Cards are organized into decks based on your settings
- Default deck name can be set in plugin settings
- Override deck for specific cards with: `<!-- deck: CustomDeck -->`

