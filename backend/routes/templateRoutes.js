// routes/templateRoutes.js
import express from "express";

const router = express.Router();

// Prebuilt templates with design metadata
const PREBUILT_TEMPLATES = [
  {
    id: "tpl1",
    name: "Business Pitch Deck",
    thumbnail:
      "https://cms-media.slidesai.io/wp-content/uploads/2024/02/20140647/Cover-Pitch-deck-vs-business-plan.png",
    link: "https://docs.google.com/presentation/d/10vyTYBuu9CgZE8Q8ES30sAzx16CkwMo_ZPuuLSuewdg/copy",
    // 🧩 design info
    background:
      "https://images.unsplash.com/photo-1522202195461-98d9a9aa8b6b?auto=format&fit=crop&w=1200&q=60",
    titleColor: "003366",
    textColor: "222222",
    font: "Calibri",
  },
  {
    id: "tpl2",
    name: "Book Report",
    thumbnail:
      "https://www.bibguru.com/blog/img/book-report-1400x700.png",
    link: "https://docs.google.com/presentation/d/1dPIqKfjDCGGZehxy5bQybSKtKtyMONPEAIY5d7FFsmo/copy",
    background:
      "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=60",
    titleColor: "5A3E1B",
    textColor: "2F241F",
    font: "Georgia",
  },
  {
    id: "tpl3",
    name: "Educational Template",
    thumbnail:
      "https://slidemodel.com/wp-content/uploads/60508-01-e-learning-powerpoint-template-16x9-1.jpg",
    link: "https://docs.google.com/presentation/d/1qoe2xLXw1XqnTP_1UBHyE1WYSd2wiE02_R7elzLzmss/copy",
    background:
      "https://images.unsplash.com/photo-1584697964191-3b79c8daec3d?auto=format&fit=crop&w=1200&q=60",
    titleColor: "2A6F97",
    textColor: "0A2472",
    font: "Arial",
  },
];

router.get("/templates/list", (req, res) => {
  res.json(PREBUILT_TEMPLATES);
});

router.post("/templates/use/:id", (req, res) => {
  const { id } = req.params;
  const tpl = PREBUILT_TEMPLATES.find((t) => t.id === id);
  if (!tpl)
    return res.status(404).json({ success: false, message: "Template not found" });
  
  res.json({
    success: true,
    template: {
      link: tpl.link,
      background: tpl.background,
      titleColor: tpl.titleColor,
      textColor: tpl.textColor,
      font: tpl.font,
    },
  });
});


export default router;
