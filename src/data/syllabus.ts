/**
 * Y9 syllabus scaffold.
 *
 * PROVENANCE — read before editing.
 *
 * The project itself contained no syllabus data, so this file seeds the
 * structure from the published Cambridge IGCSE subject content for each
 * subject code below. Nothing here is invented: chapters are the numbered
 * subject-content sections of each syllabus, and topics are their listed
 * subsections.
 *
 * It is a STARTING POINT, not an authority. A Y9 scheme of work normally
 * covers a subset of the full IGCSE content, in a different order, and your
 * school may split or name things differently. Everything seeded here can be
 * renamed, reordered, added to or deleted inside the app, and the app never
 * re-seeds over your edits.
 *
 * To add or replace a subject's syllabus, add an entry below (or use
 * Settings -> import) — no UI code needs to change.
 */

export interface SeedChapter {
  /** Syllabus reference, e.g. "2". '' when the section is not numbered. */
  code: string;
  name: string;
  topics: Array<{ code: string; name: string }>;
}

export interface SeedSubject {
  name: string;
  code: string;
  /** Shown once on the Syllabus page so the scaffold is never mistaken for fact. */
  note: string;
  chapters: SeedChapter[];
}

const t = (code: string, name: string) => ({ code, name });

export const SYLLABUS_SEED: SeedSubject[] = [
  {
    name: 'Mathematics',
    code: '0580',
    note: 'Seeded from the Cambridge IGCSE Mathematics (0580) subject content strands.',
    chapters: [
      {
        code: '1',
        name: 'Number',
        topics: [
          t('1.1', 'Types of number'),
          t('1.2', 'Sets'),
          t('1.3', 'Powers and roots'),
          t('1.4', 'Fractions, decimals and percentages'),
          t('1.5', 'Ordering'),
          t('1.6', 'The four operations'),
          t('1.7', 'Indices'),
          t('1.8', 'Standard form'),
          t('1.9', 'Estimation'),
          t('1.10', 'Limits of accuracy'),
          t('1.11', 'Ratio and proportion'),
          t('1.12', 'Rates'),
          t('1.13', 'Percentages'),
          t('1.14', 'Using a calculator'),
          t('1.15', 'Time'),
          t('1.16', 'Money'),
          t('1.17', 'Exponential growth and decay'),
        ],
      },
      {
        code: '2',
        name: 'Algebra and graphs',
        topics: [
          t('2.1', 'Introduction to algebra'),
          t('2.2', 'Algebraic manipulation'),
          t('2.3', 'Algebraic fractions'),
          t('2.4', 'Indices in algebra'),
          t('2.5', 'Equations'),
          t('2.6', 'Inequalities'),
          t('2.7', 'Sequences'),
          t('2.8', 'Proportion'),
          t('2.9', 'Graphs in practical situations'),
          t('2.10', 'Graphs of functions'),
          t('2.11', 'Sketching curves'),
          t('2.12', 'Functions'),
        ],
      },
      {
        code: '3',
        name: 'Coordinate geometry',
        topics: [
          t('3.1', 'Coordinates'),
          t('3.2', 'Drawing linear graphs'),
          t('3.3', 'Gradient of linear graphs'),
          t('3.4', 'Length and midpoint'),
          t('3.5', 'Equations of linear graphs'),
          t('3.6', 'Parallel lines'),
          t('3.7', 'Perpendicular lines'),
        ],
      },
      {
        code: '4',
        name: 'Geometry',
        topics: [
          t('4.1', 'Geometrical terms'),
          t('4.2', 'Geometrical constructions'),
          t('4.3', 'Scale drawings'),
          t('4.4', 'Similarity'),
          t('4.5', 'Symmetry'),
          t('4.6', 'Angles'),
          t('4.7', 'Circle theorems'),
        ],
      },
      {
        code: '5',
        name: 'Mensuration',
        topics: [
          t('5.1', 'Units of measure'),
          t('5.2', 'Area and perimeter'),
          t('5.3', 'Circles, arcs and sectors'),
          t('5.4', 'Surface area and volume'),
          t('5.5', 'Compound shapes and parts of shapes'),
        ],
      },
      {
        code: '6',
        name: 'Trigonometry',
        topics: [
          t('6.1', "Pythagoras' theorem"),
          t('6.2', 'Right-angled triangles'),
          t('6.3', 'Exact trigonometric values'),
          t('6.4', 'Trigonometric functions'),
          t('6.5', 'Non-right-angled triangles'),
          t('6.6', 'Pythagoras and trigonometry in 3D'),
        ],
      },
      {
        code: '7',
        name: 'Transformations and vectors',
        topics: [
          t('7.1', 'Transformations'),
          t('7.2', 'Vectors in two dimensions'),
          t('7.3', 'Magnitude of a vector'),
          t('7.4', 'Vector geometry'),
        ],
      },
      {
        code: '8',
        name: 'Probability',
        topics: [
          t('8.1', 'Introduction to probability'),
          t('8.2', 'Relative and expected frequencies'),
          t('8.3', 'Probability of combined events'),
          t('8.4', 'Conditional probability'),
        ],
      },
      {
        code: '9',
        name: 'Statistics',
        topics: [
          t('9.1', 'Classifying statistical data'),
          t('9.2', 'Interpreting statistical data'),
          t('9.3', 'Averages and measures of spread'),
          t('9.4', 'Statistical charts and diagrams'),
          t('9.5', 'Scatter diagrams'),
          t('9.6', 'Cumulative frequency diagrams'),
          t('9.7', 'Histograms'),
        ],
      },
    ],
  },

  {
    name: 'Physics',
    code: '0625',
    note: 'Seeded from the Cambridge IGCSE Physics (0625) subject content sections.',
    chapters: [
      {
        code: '1',
        name: 'Motion, forces and energy',
        topics: [
          t('1.1', 'Physical quantities and measurement techniques'),
          t('1.2', 'Motion'),
          t('1.3', 'Mass and weight'),
          t('1.4', 'Density'),
          t('1.5', 'Forces'),
          t('1.6', 'Momentum'),
          t('1.7', 'Energy, work and power'),
          t('1.8', 'Pressure'),
        ],
      },
      {
        code: '2',
        name: 'Thermal physics',
        topics: [
          t('2.1', 'Kinetic particle model of matter'),
          t('2.2', 'Thermal properties and temperature'),
          t('2.3', 'Transfer of thermal energy'),
        ],
      },
      {
        code: '3',
        name: 'Waves',
        topics: [
          t('3.1', 'General properties of waves'),
          t('3.2', 'Light'),
          t('3.3', 'Electromagnetic spectrum'),
          t('3.4', 'Sound'),
        ],
      },
      {
        code: '4',
        name: 'Electricity and magnetism',
        topics: [
          t('4.1', 'Simple phenomena of magnetism'),
          t('4.2', 'Electrical quantities'),
          t('4.3', 'Electric circuits'),
          t('4.4', 'Electrical safety'),
          t('4.5', 'Electromagnetic effects'),
        ],
      },
      {
        code: '5',
        name: 'Nuclear physics',
        topics: [t('5.1', 'The nuclear model of the atom'), t('5.2', 'Radioactivity')],
      },
      {
        code: '6',
        name: 'Space physics',
        topics: [t('6.1', 'Earth and the Solar System'), t('6.2', 'Stars and the Universe')],
      },
    ],
  },

  {
    name: 'Chemistry',
    code: '0620',
    note: 'Seeded from the Cambridge IGCSE Chemistry (0620) subject content sections.',
    chapters: [
      {
        code: '1',
        name: 'States of matter',
        topics: [t('1.1', 'Solids, liquids and gases'), t('1.2', 'Diffusion')],
      },
      {
        code: '2',
        name: 'Atoms, elements and compounds',
        topics: [
          t('2.1', 'Elements, compounds and mixtures'),
          t('2.2', 'Atomic structure and the Periodic Table'),
          t('2.3', 'Isotopes'),
          t('2.4', 'Ions and ionic bonds'),
          t('2.5', 'Simple molecules and covalent bonds'),
          t('2.6', 'Giant covalent structures'),
          t('2.7', 'Metallic bonding'),
        ],
      },
      {
        code: '3',
        name: 'Stoichiometry',
        topics: [
          t('3.1', 'Formulae'),
          t('3.2', 'Relative masses of atoms and molecules'),
          t('3.3', 'The mole and the Avogadro constant'),
        ],
      },
      {
        code: '4',
        name: 'Electrochemistry',
        topics: [t('4.1', 'Electrolysis'), t('4.2', 'Hydrogen-oxygen fuel cells')],
      },
      {
        code: '5',
        name: 'Chemical energetics',
        topics: [t('5.1', 'Exothermic and endothermic reactions')],
      },
      {
        code: '6',
        name: 'Chemical reactions',
        topics: [
          t('6.1', 'Physical and chemical changes'),
          t('6.2', 'Rate of reaction'),
          t('6.3', 'Reversible reactions and equilibrium'),
          t('6.4', 'Redox'),
        ],
      },
      {
        code: '7',
        name: 'Acids, bases and salts',
        topics: [
          t('7.1', 'The characteristic properties of acids and bases'),
          t('7.2', 'Oxides'),
          t('7.3', 'Preparation of salts'),
        ],
      },
      {
        code: '8',
        name: 'The Periodic Table',
        topics: [
          t('8.1', 'Arrangement of elements'),
          t('8.2', 'Group I properties'),
          t('8.3', 'Group VII properties'),
          t('8.4', 'Transition elements'),
          t('8.5', 'Noble gases'),
        ],
      },
      {
        code: '9',
        name: 'Metals',
        topics: [
          t('9.1', 'Properties of metals'),
          t('9.2', 'Uses of metals'),
          t('9.3', 'Alloys and their properties'),
          t('9.4', 'Reactivity series'),
          t('9.5', 'Corrosion of metals'),
          t('9.6', 'Extraction of metals'),
        ],
      },
      {
        code: '10',
        name: 'Chemistry of the environment',
        topics: [t('10.1', 'Water'), t('10.2', 'Fertilisers'), t('10.3', 'Air quality and climate')],
      },
      {
        code: '11',
        name: 'Organic chemistry',
        topics: [
          t('11.1', 'Formulae, functional groups and terminology'),
          t('11.2', 'Naming organic compounds'),
          t('11.3', 'Fuels'),
          t('11.4', 'Alkanes'),
          t('11.5', 'Alkenes'),
          t('11.6', 'Alcohols'),
          t('11.7', 'Carboxylic acids'),
          t('11.8', 'Polymers'),
        ],
      },
      {
        code: '12',
        name: 'Experimental techniques and chemical analysis',
        topics: [
          t('12.1', 'Experimental design'),
          t('12.2', 'Acid-base titrations'),
          t('12.3', 'Chromatography'),
          t('12.4', 'Separation and purification'),
          t('12.5', 'Identification of ions and gases'),
        ],
      },
    ],
  },

  {
    name: 'English Language',
    code: '0500',
    note:
      'Cambridge IGCSE First Language English (0500) is assessed by skill rather than by topic, so this scaffold follows the reading, writing and speaking assessment objectives.',
    chapters: [
      {
        code: 'R',
        name: 'Reading',
        topics: [
          t('R1', 'Understanding explicit meaning'),
          t('R2', 'Understanding implicit meaning and attitude'),
          t('R3', 'Analysing how writers use language'),
          t('R4', 'Selecting and summarising information'),
          t('R5', 'Synthesising information from more than one text'),
          t('', 'Extended response to reading'),
        ],
      },
      {
        code: 'W',
        name: 'Writing',
        topics: [
          t('W1', 'Directed writing'),
          t('W2', 'Descriptive writing'),
          t('W3', 'Narrative writing'),
          t('W4', 'Structuring and sequencing ideas'),
          t('W5', 'Vocabulary and sentence variety'),
          t('', 'Accuracy: spelling, punctuation and grammar'),
        ],
      },
      {
        code: 'S',
        name: 'Speaking and listening',
        topics: [
          t('S1', 'Individual task presentation'),
          t('S2', 'Conversation task'),
          t('S3', 'Listening and responding'),
        ],
      },
    ],
  },

  {
    name: 'Computer Science',
    code: '0478',
    note: 'Seeded from the Cambridge IGCSE Computer Science (0478) subject content sections.',
    chapters: [
      {
        code: '1',
        name: 'Data representation',
        topics: [
          t('1.1', 'Number systems'),
          t('1.2', 'Text, sound and images'),
          t('1.3', 'Data storage and file compression'),
        ],
      },
      {
        code: '2',
        name: 'Data transmission',
        topics: [
          t('2.1', 'Types and methods of data transmission'),
          t('2.2', 'Methods of error detection'),
          t('2.3', 'Encryption'),
        ],
      },
      {
        code: '3',
        name: 'Hardware',
        topics: [
          t('3.1', 'Computer architecture'),
          t('3.2', 'Input and output devices'),
          t('3.3', 'Data storage'),
          t('3.4', 'Network hardware'),
        ],
      },
      {
        code: '4',
        name: 'Software',
        topics: [
          t('4.1', 'Types of software and interrupts'),
          t('4.2', 'Types of programming language, translators and IDEs'),
        ],
      },
      {
        code: '5',
        name: 'The internet and its uses',
        topics: [
          t('5.1', 'The internet and the world wide web'),
          t('5.2', 'Digital currency'),
          t('5.3', 'Cyber security'),
        ],
      },
      {
        code: '6',
        name: 'Automated and emerging technologies',
        topics: [
          t('6.1', 'Automated systems'),
          t('6.2', 'Robotics'),
          t('6.3', 'Artificial intelligence'),
        ],
      },
      {
        code: '7',
        name: 'Algorithms, programming and logic',
        topics: [
          t('7.1', 'Algorithm design and problem solving'),
          t('7.2', 'Programming'),
          t('7.3', 'Databases'),
          t('7.4', 'Boolean logic'),
        ],
      },
    ],
  },
];

export function seedForCode(code: string): SeedSubject | undefined {
  return SYLLABUS_SEED.find((s) => s.code === code);
}

export function seedForName(name: string): SeedSubject | undefined {
  const lower = name.trim().toLowerCase();
  return SYLLABUS_SEED.find(
    (s) => s.name.toLowerCase() === lower || s.name.toLowerCase().startsWith(lower),
  );
}
