import type { Quiz } from "./types";
export const sample: Quiz = {
  title: "Clinical foundations",
  subject: "Medicine",
  questions: [
    {
      id: 1,
      system: "Cardiovascular",
      question:
        "A 24-year-old student becomes lightheaded after standing quickly following a long period of lying down. Her symptoms resolve within seconds. Which initial physiological change most directly triggers the compensatory baroreceptor response?",
      options: {
        a: "Reduced venous return and arterial pressure",
        b: "Increased left ventricular contractility",
        c: "Increased carotid sinus firing",
        d: "Reduced systemic vascular resistance",
      },
      correct_answer: "a",
      explanation:
        "Standing shifts blood into dependent veins. The initial fall in venous return reduces stroke volume and arterial pressure. Reduced stretch at arterial baroreceptors decreases their firing, leading to increased sympathetic and reduced parasympathetic activity.",
      option_explanations: {
        a: "Venous pooling reduces cardiac filling, stroke volume and arterial pressure; this is the initiating change.",
        b: "Increased contractility is a compensatory response, rather than the initial trigger.",
        c: "A fall in arterial pressure initially decreases baroreceptor firing.",
        d: "Compensation increases systemic vascular resistance; a fall would worsen hypotension.",
      },
      concept_card: {
        question:
          "How does standing suddenly activate the arterial baroreflex?",
        answer:
          "Venous pooling reduces arterial pressure and baroreceptor firing.",
        explanation:
          "The resulting sympathetic response increases heart rate, contractility and vascular tone.",
      },
      tags: ["baroreflex", "physiology"],
    },
    {
      id: 2,
      system: "Respiratory",
      question:
        "A patient has an acute obstruction of a pulmonary artery supplying a ventilated lung region. Assuming ventilation to that region is initially maintained, what happens to its ventilation–perfusion ratio?",
      options: {
        a: "It rises toward infinity",
        b: "It falls toward zero",
        c: "It remains unchanged",
        d: "It becomes equal to that of a true shunt",
      },
      correct_answer: "a",
      explanation:
        "The affected region remains ventilated but loses perfusion. Its ventilation–perfusion ratio rises, creating alveolar dead space.",
      option_explanations: {
        a: "Ventilation divided by progressively less perfusion increases markedly.",
        b: "A ratio approaching zero describes perfusion with absent ventilation.",
        c: "Loss of perfusion changes the denominator, so the ratio cannot remain unchanged.",
        d: "A true shunt is perfusion without ventilation, the opposite local pattern.",
      },
      concept_card: {
        question: "What distinguishes alveolar dead space from a true shunt?",
        answer:
          "Dead space is ventilation without perfusion; a shunt is perfusion without ventilation.",
        explanation:
          "Both impair effective gas exchange, but their ventilation–perfusion patterns are opposite.",
      },
      tags: ["VQ", "physiology"],
    },
    {
      id: 3,
      system: "Renal",
      question:
        "A previously healthy adult loses a substantial amount of blood. Before any fluid is administered, which response helps preserve glomerular filtration during a moderate fall in renal perfusion?",
      options: {
        a: "Preferential efferent arteriolar constriction mediated by angiotensin II",
        b: "Complete relaxation of the efferent arteriole",
        c: "Suppression of renin release",
        d: "An immediate increase in sodium delivery to the macula densa",
      },
      correct_answer: "a",
      explanation:
        "During a moderate reduction in perfusion, angiotensin II preferentially constricts the efferent arteriole, helping maintain glomerular capillary pressure. This compensation is limited and does not imply that filtration is maintained in severe shock.",
      option_explanations: {
        a: "Efferent constriction supports glomerular pressure despite reduced renal blood flow.",
        b: "Efferent dilation reduces glomerular capillary pressure.",
        c: "Reduced renal perfusion activates rather than suppresses renin release.",
        d: "Reduced filtration generally reduces distal sodium delivery, contributing to renin activation.",
      },
      concept_card: {
        question:
          "How does angiotensin II help maintain filtration during a moderate fall in renal perfusion?",
        answer: "It preferentially constricts the efferent arteriole.",
        explanation:
          "This supports glomerular capillary pressure, although severe hypoperfusion can overwhelm compensation.",
      },
      tags: ["renal", "RAAS"],
    },
    {
      id: 4,
      system: "Endocrine",
      question:
        "A patient with untreated primary hypothyroidism has a low free thyroxine concentration. Which additional laboratory finding is most consistent with an intact pituitary response?",
      options: {
        a: "An increased thyroid-stimulating hormone concentration",
        b: "A suppressed thyroid-stimulating hormone concentration",
        c: "An absent response of thyroid-stimulating hormone to low thyroxine",
        d: "A high free thyroxine concentration on repeat testing without treatment",
      },
      correct_answer: "a",
      explanation:
        "Primary thyroid failure reduces thyroid hormone feedback at the pituitary and hypothalamus. With an intact axis, thyroid-stimulating hormone rises.",
      option_explanations: {
        a: "Loss of negative feedback produces a compensatory rise in TSH.",
        b: "Low or inappropriately normal TSH with low free thyroxine suggests central disease.",
        c: "An absent compensatory response is inconsistent with the stated intact pituitary response.",
        d: "Persistently untreated primary failure does not explain spontaneous high free thyroxine in this scenario.",
      },
      concept_card: {
        question:
          "What is the typical TSH and free T4 pattern in primary hypothyroidism?",
        answer: "Raised TSH with low free T4.",
        explanation:
          "The pituitary increases TSH because thyroid hormone negative feedback is reduced.",
      },
      tags: ["thyroid", "feedback"],
    },
  ],
};
