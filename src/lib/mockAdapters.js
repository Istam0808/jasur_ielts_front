const LISTENING_KEYS = ["listening_p1", "listening_p2", "listening_p3", "listening_p4"];
const READING_KEYS = ["reading_p1", "reading_p2", "reading_p3"];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toOptionLabel(option, index) {
  if (option && typeof option === "object") {
    const label = option.label ? String(option.label).toUpperCase() : String.fromCharCode(65 + index);
    const text = option.text ? String(option.text) : "";
    return text ? `${label}) ${text}` : label;
  }

  if (typeof option === "string") {
    return option;
  }

  return `${String.fromCharCode(65 + index)}) Option ${index + 1}`;
}

function mapListeningType(sectionType, question) {
  if (!sectionType) return "fill_in_blank";
  const normalized = String(sectionType).toLowerCase();
  const optionsCount = asArray(question?.options).length;

  if (normalized.includes("multiple_choice")) {
    return optionsCount > 3 ? "multiple_choice_two" : "multiple_choice";
  }
  if (normalized.includes("map")) return "map_labeling";
  if (normalized.includes("matching")) return "matching";
  if (normalized.includes("true_false")) return "true_false";
  return "fill_in_blank";
}

function mapReadingType(sectionType) {
  if (!sectionType) return "short_answer";
  const normalized = String(sectionType).toLowerCase();

  if (normalized.includes("matching_headings")) return "matching_headings";
  if (normalized.includes("matching_information")) return "matching_information";
  if (normalized.includes("matching_features")) return "matching_features";
  if (normalized.includes("sentence_completion")) return "sentence_completion";
  if (normalized.includes("summary_completion")) return "summary_completion";
  if (normalized.includes("table_completion")) return "table_completion";
  if (normalized.includes("flow_chart_completion")) return "flow_chart_completion";
  if (normalized.includes("diagram")) return "diagram_labelling";
  if (normalized.includes("note_completion")) return "note_completion";
  if (normalized.includes("yes_no_not_given")) return "yes_no_not_given";
  if (normalized.includes("true_false_not_given")) return "true_false_not_given";
  if (normalized.includes("multiple_choice")) return "multiple_choice";
  return "short_answer";
}

export function adaptListening(mockDetail) {
  const adapted = adaptListeningMockToUi(mockDetail);
  return adapted?.bookData?.tests?.[0] ?? null;
}

export function adaptListeningMockToUi(mockDetail) {
  const mockId = Number(mockDetail?.id) || 1;
  const answersByQuestionNumber = {};
  let questionNumber = 1;

  const parts = LISTENING_KEYS.map((key, partIndex) => {
    const part = mockDetail?.[key];
    if (!part) return null;

    const startNumber = questionNumber;
    const sections = asArray(part.sections).map((section) => {
      const questions = asArray(section?.questions).map((question) => {
        const number = questionNumber;
        questionNumber += 1;

        const type = mapListeningType(section?.section_type, question);
        const base = {
          number,
          type,
          text: question?.question_text || `Question ${number} _________`,
        };

        if (type === "multiple_choice" || type === "multiple_choice_two") {
          base.options = asArray(question?.options).map(toOptionLabel);
        }

        if (type === "matching") {
          base.text = question?.question_text || `Item ${number}`;
        }

        if (type === "true_false") {
          base.statement = question?.question_text || `Statement ${number}`;
        }

        const rawAnswer =
          question?.correct_answer ||
          question?.answer ||
          question?.correct ||
          "";
        answersByQuestionNumber[number] = String(rawAnswer || "");
        return base;
      });

      const start = questions[0]?.number || startNumber;
      const end = questions[questions.length - 1]?.number || start;

      return {
        questionRange: `${start}-${end}`,
        instruction: section?.instructions || "Answer the questions below.",
        context: section?.title || `Part ${partIndex + 1}`,
        options_box: asArray(section?.options).map(toOptionLabel),
        questions,
      };
    });

    const endNumber = questionNumber - 1;
    const hasQuestions = endNumber >= startNumber;

    return {
      part: Number(part?.part) || partIndex + 1,
      questionRange: hasQuestions ? `${startNumber}-${endNumber}` : `${startNumber}-${startNumber}`,
      audioUrl: part?.audio_file || "",
      sections,
    };
  }).filter(Boolean);

  const test = {
    id: mockId,
    name: `Mock ${mockId}`,
    type: "LISTENING",
    parts,
  };

  return {
    bookId: `mock-${mockId}`,
    testId: mockId,
    testTitle: `Mock ${mockId} Listening`,
    bookData: {
      id: `mock-${mockId}`,
      tests: [test],
    },
    answersData: {
      [`test_${mockId}`]: answersByQuestionNumber,
    },
  };
}

export function adaptReading(mockDetail) {
  return adaptReadingMockToUi(mockDetail);
}

export function adaptReadingMockToUi(mockDetail) {
  const mockId = Number(mockDetail?.id) || 1;
  let questionId = 1;

  const passages = READING_KEYS.map((key, passageIndex) => {
    const passage = mockDetail?.[key];
    if (!passage) return null;

    const questions = asArray(passage.sections).flatMap((section) => {
      const type = mapReadingType(section?.section_type);
      const sourceQuestions = asArray(section?.questions);

      if (type === "multiple_choice" || type === "true_false_not_given" || type === "yes_no_not_given") {
        return sourceQuestions.map((question) => ({
          id: questionId++,
          type,
          question: question?.question_text || question?.text || "",
          statement: question?.question_text || question?.text || "",
          options: asArray(question?.options).length
            ? asArray(question.options).map(toOptionLabel)
            : type.includes("true_false")
              ? ["TRUE", "FALSE", "NOT GIVEN"]
              : [],
        }));
      }

      if (type === "matching_headings") {
        return [{
          id: questionId++,
          type,
          instruction: section?.instructions || "Match headings.",
          sections: sourceQuestions.map((q, idx) => `${idx + 1}. ${q?.question_text || `Paragraph ${idx + 1}`}`),
          options: sourceQuestions[0]?.options?.length
            ? sourceQuestions[0].options.map(toOptionLabel)
            : [],
        }];
      }

      if (type === "matching_information") {
        return [{
          id: questionId++,
          type,
          instruction: section?.instructions || "Match information.",
          information: sourceQuestions.map((q, idx) => `${idx + 1}. ${q?.question_text || `Information ${idx + 1}`}`),
          options: sourceQuestions[0]?.options?.length
            ? sourceQuestions[0].options.map(toOptionLabel)
            : [],
        }];
      }

      if (type === "matching_features") {
        return [{
          id: questionId++,
          type,
          instruction: section?.instructions || "Match features.",
          features: sourceQuestions.map((q, idx) => `${idx + 1}. ${q?.question_text || `Feature ${idx + 1}`}`),
          items: sourceQuestions[0]?.options?.length
            ? sourceQuestions[0].options.map(toOptionLabel)
            : [],
        }];
      }

      if (type === "sentence_completion") {
        return [{
          id: questionId++,
          type,
          instruction: section?.instructions || "Complete the sentences.",
          sentences: sourceQuestions.map((q, idx) => `${idx + 1}. ${q?.question_text || ""}`),
          endings: sourceQuestions[0]?.options?.length
            ? sourceQuestions[0].options.map(toOptionLabel)
            : [],
        }];
      }

      return [{
        id: questionId++,
        type: "short_answer",
        instruction: section?.instructions || "Answer the questions.",
        questions: sourceQuestions.map((q, idx) => `${idx + 1}. ${q?.question_text || ""}`),
      }];
    });

    return {
      passage_id: passageIndex + 1,
      title: passage?.title || `Reading passage ${passageIndex + 1}`,
      topic: passage?.topic || "",
      text: passage?.text || "",
      question_range: "",
      questions,
    };
  }).filter(Boolean);

  return {
    id: mockId,
    module: "academic",
    title: `Mock ${mockId}`,
    topic: "Backend mock reading",
    source: "backend-mock",
    mockId,
    total_questions: passages.reduce(
      (sum, passage) => sum + asArray(passage.questions).length,
      0
    ),
    total_passages: passages.length,
    passages,
    metadata: { timeLimit: 60, skills: ["Reading"] },
  };
}

export function adaptWriting(mockDetail) {
  return adaptWritingMockToUi(mockDetail);
}

export function adaptWritingMockToUi(mockDetail) {
  const mockId = Number(mockDetail?.id) || 1;
  const task1 = mockDetail?.writing_task1 || {};
  const task2 = mockDetail?.writing_task2 || {};

  return {
    id: mockId,
    topic:
      task1?.question_text ||
      task2?.question_text ||
      `Mock ${mockId} Writing Task`,
    relatedVocabulary: [],
  };
}
