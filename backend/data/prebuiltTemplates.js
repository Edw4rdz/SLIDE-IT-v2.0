// src/templates.js

// This file acts as our "database" for prebuilt templates.
export const PREBUILT_TEMPLATES = [
  {
    id: "tpl1",
    name: "Business Pitch Deck",
    thumbnail:
      "https://cms-media.slidesai.io/wp-content/uploads/2024/02/20140647/Cover-Pitch-deck-vs-business-plan.png",
    // ⬇️ NEW: Added slide content structure
    slides: [
      { id: 'tpl1-s1', title: 'The Problem', bullets: ['Clearly state the problem you are solving.', 'Why does this problem matter?'], imagePrompt: 'a graph showing a downward trend' },
      { id: 'tpl1-s2', title: 'The Solution', bullets: ['Describe your product or service.', 'How does it solve the problem?'], imagePrompt: 'a diagram of a solution' },
      { id: 'tpl1-s3', title: 'Market Size', bullets: ['Who is your target customer?', 'How big is the market (TAM, SAM, SOM)?'], imagePrompt: 'a pie chart of market segments' },
      { id: 'tpl1-s4', title: 'Why Us?', bullets: ['What is your unique advantage?', 'Introduce your core team.'], imagePrompt: 'a team of professionals working together' }
    ],
    // Design info
    background:
      "https://images.unsplash.com/photo-1522202195461-98d9a9aa8b6b?auto=format&fit=crop&w=1200&q=60",
    titleColor: "#003366", // Added # for consistency
    textColor: "#222222", // Added #
    font: "Calibri",
  },
  {
    id: "tpl2",
    name: "Book Report",
    thumbnail:
      "https://www.bibguru.com/blog/img/book-report-1400x700.png",
    // ⬇️ NEW: Added slide content structure
    slides: [
      { id: 'tpl2-s1', title: 'Book Report: [Book Title]', bullets: ['Author: [Author Name]', 'Genre: [Book Genre]'], imagePrompt: 'a classic book cover' },
      { id: 'tpl2-s2', title: 'Plot Summary', bullets: ['Beginning: [Main plot point]', 'Middle: [Main plot point]', 'End: [Main plot point]'], imagePrompt: 'a story map or journey' },
      { id: 'tpl2-s3', title: 'Main Characters', bullets: ['**Character 1:** Description.', '**Character 2:** Description.'], imagePrompt: 'portraits of two distinct people' },
      { id: 'tpl2-s4', title: 'My Thoughts', bullets: ['What I liked about the book.', 'What I disliked or would change.'], imagePrompt: 'a person thinking' }
    ],
    // Design info
    background:
      "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=60",
    titleColor: "#5A3E1B", // Added #
    textColor: "#2F241F", // Added #
    font: "Georgia",
  },
  {
    id: "tpl3",
    name: "Educational Lesson",
    thumbnail:
      "https://slidemodel.com/wp-content/uploads/60508-01-e-learning-powerpoint-template-16x9-1.jpg",
    // ⬇️ NEW: Added slide content structure
    slides: [
      { id: 'tpl3-s1', title: 'Lesson: [Subject Name]', bullets: ['Today\'s Topic: [Topic]', 'Grade Level: [Number]'], imagePrompt: 'a clean modern classroom' },
      { id: 'tpl3-s2', title: 'Learning Objectives', bullets: ['By the end of this lesson, you will be able to:', '1. [Objective 1]', '2. [Objective 2]'], imagePrompt: 'a target or a lightbulb icon' },
      { id: 'tpl3-s3', title: 'Key Concept 1', bullets: ['Explanation of the first concept.', 'Example: [Provide a clear example]'], imagePrompt: 'a simple diagram explaining a concept' },
      { id: 'tpl3-s4', title: 'Summary & Review', bullets: ['What did we learn today?', 'Key takeaways.'], imagePrompt: 'a checklist or summary icon' }
    ],
    // Design info
    background:
      "https://images.unsplash.com/photo-1584697964191-3b79c8daec3d?auto=format&fit=crop&w=1200&q=60",
    titleColor: "#2A6F97", // Added #
    textColor: "#0A2472", // Added #
    font: "Arial",
  },
];