const LISTENING_KEYS = ["listening_p1", "listening_p2", "listening_p3", "listening_p4"];
const READING_KEYS = ["reading_p1", "reading_p2", "reading_p3"];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function splitOptionLabelAndText(raw) {
  const source = String(raw || "").trim();
  if (!source) return { label: "", text: "" };

  const match = source.match(/^([A-Za-z])[\)\].:\-]?\s+(.+)$/);
  if (!match) {
    return { label: "", text: source };
  }

  return {
    label: String(match[1]).toUpperCase(),
    text: String(match[2] || "").trim(),
  };
}

function toOptionData(option, index) {
  const fallbackLabel = String.fromCharCode(65 + index);

  if (option && typeof option === "object") {
    const rawLabel = option.label ?? option.value ?? fallbackLabel;
    const label = String(rawLabel || fallbackLabel).trim().toUpperCase() || fallbackLabel;
    const rawText =
      option.text ??
      option.option_text ??
      option.answer ??
      option.content ??
      "";
    const text = String(rawText || "").trim();

    return {
      value: label,
      label,
      text: text || label,
    };
  }

  if (typeof option === "string") {
    const { label, text } = splitOptionLabelAndText(option);
    const normalizedLabel = (label || fallbackLabel).toUpperCase();
    return {
      value: normalizedLabel,
      label: normalizedLabel,
      text: text || String(option).trim() || normalizedLabel,
    };
  }

  return {
    value: fallbackLabel,
    label: fallbackLabel,
    text: `Option ${index + 1}`,
  };
}

function isPlaceholderQuestionText(str) {
  if (str == null) return true;
  const s = String(str).trim();
  if (!s) return true;
  return /^[\s\-–—]+$/.test(s);
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
  if (normalized.includes("raw_html")) return "fill_in_blank";
  if (normalized.includes("table_completion")) return "fill_in_blank";
  return "fill_in_blank";
}

function mapReadingType(sectionType) {
  if (!sectionType) return "short_answer";
  const normalized = String(sectionType).toLowerCase();

  if (normalized.includes("matching_headings")) return "matching_headings";
  if (normalized.includes("matching_information")) return "matching_information";
  if (normalized.includes("matching_people")) return "matching_people";
  if (normalized.includes("matching_features")) return "matching_features";
  if (normalized.includes("matching_sentences")) return "matching_sentences";
  if (normalized.includes("sentence_completion")) return "sentence_completion";
  if (normalized.includes("summary_completion")) return "summary_completion";
  if (normalized.includes("table_completion")) return "table_completion";
  if (normalized.includes("flow_chart_completion")) return "flow_chart_completion";
  if (normalized.includes("diagram")) return "diagram_labelling";
  if (normalized.includes("note_completion")) return "note_completion";
  if (normalized.includes("yes_no_not_given")) return "yes_no_not_given";
  if (normalized.includes("true_false_not_given")) return "true_false_not_given";
  if (normalized.includes("multiple_choice_multiple_answers")) return "multiple_choice_multiple";
  if (normalized.includes("multiple_choice")) return "multiple_choice";
  return "short_answer";
}

function toReadingSelection(selection, index) {
  const label = selection?.label != null
    ? String(selection.label).trim()
    : String(index + 1);
  const text = selection?.text != null ? String(selection.text).trim() : "";
  return {
    id: Number(selection?.id) || index + 1,
    label,
    text,
    value: label,
  };
}

function extractQuestionPlaceholders(text) {
  if (typeof text !== "string" || !text.trim()) return [];
  const matches = Array.from(text.matchAll(/\{\{question:(\d+)\}\}/g)).map((m) => String(m[1]));
  return Array.from(new Set(matches));
}

function normalizeCompletionPlaceholders(text) {
  if (typeof text !== "string" || !text.trim()) return "";
  return text.replace(/\{\{question:(\d+)\}\}/g, "___$1___");
}

function toCompletionAnswers(questions) {
  return asArray(questions)
    .map((question) => {
      const blankId = question?.order != null ? String(question.order).trim() : "";
      if (!blankId) return null;

      const answerValue = question?.correct_answer ?? question?.answer ?? question?.correct ?? "";
      if (answerValue == null || String(answerValue).trim() === "") return null;

      return {
        blank: blankId,
        answer: String(answerValue).trim(),
      };
    })
    .filter(Boolean);
}

function extractImageUrl(imageLike) {
  if (!imageLike) return "";
  if (typeof imageLike === "string") return imageLike.trim();

  if (typeof imageLike !== "object") return "";

  const candidates = [
    imageLike.image_url,
    imageLike.imageUrl,
    imageLike.url,
    imageLike.file,
    imageLike.image,
    imageLike.src,
    imageLike.path,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function normalizeWritingImages(task) {
  const fromArray = asArray(task?.images)
    .map((item) => {
      if (!item) return null;
      const url = extractImageUrl(item);
      if (!url) return null;
      return {
        id: Number(item.id) || null,
        order: Number(item.order) || null,
        url,
      };
    })
    .filter(Boolean);

  if (fromArray.length) return fromArray;

  const fallbackSingle = [
    task?.image_url,
    task?.imageUrl,
    task?.image,
    task?.file,
    task?.url,
  ];

  const singleUrl = fallbackSingle.find(
    (value) => typeof value === "string" && value.trim()
  );

  if (!singleUrl) return [];
  return [{ id: null, order: 1, url: String(singleUrl).trim() }];
}

function parseQuestionNumberRange(questionNumber) {
  if (typeof questionNumber === "number" && Number.isFinite(questionNumber)) {
    return [questionNumber];
  }
  if (typeof questionNumber !== "string") return [];

  const raw = questionNumber.trim();
  if (!raw) return [];
  if (!raw.includes("-")) {
    const one = Number(raw);
    return Number.isFinite(one) ? [one] : [];
  }

  const [startRaw, endRaw] = raw.split("-");
  const start = Number(startRaw);
  const end = Number(endRaw);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];

  const numbers = [];
  for (let current = start; current <= end; current += 1) {
    numbers.push(current);
  }
  return numbers;
}

function extractPassageParagraphLetters(passageText) {
  const source = typeof passageText === "string" ? passageText : "";
  if (!source.trim()) return [];

  const fromHtml = Array.from(source.matchAll(/<b>\s*([A-Za-z])\s*<\/b>/g))
    .map((m) => String(m[1] || "").toUpperCase())
    .filter(Boolean);
  if (fromHtml.length) {
    return Array.from(new Set(fromHtml));
  }

  const fromPlain = Array.from(source.matchAll(/(?:^|\n)\s*([A-Za-z])\s{1,3}/g))
    .map((m) => String(m[1] || "").toUpperCase())
    .filter(Boolean);

  return Array.from(new Set(fromPlain));
}

function buildMatchingInformationOptions(section, passageText) {
  const fromSelections = asArray(section?.list_selections)
    .map((selection, index) => toOptionData(selection, index))
    .filter(Boolean);
  if (fromSelections.length) return fromSelections;

  const fromQuestionOptions = asArray(section?.questions)
    .flatMap((q) => asArray(q?.options))
    .map((option, index) => toOptionData(option, index))
    .filter(Boolean);
  if (fromQuestionOptions.length) {
    // De-duplicate by label/value to avoid repeated options coming from each question.
    const seen = new Set();
    return fromQuestionOptions.filter((opt) => {
      const key = String(opt?.value || opt?.label || "").toUpperCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const letters = extractPassageParagraphLetters(passageText);
  if (letters.length) {
    return letters.map((letter, index) => toOptionData({ label: letter, text: letter }, index));
  }

  return [];
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
    const sections = asArray(part.sections).map((section, sectionIndex) => {
      const sectionTypeRaw = section?.section_type != null ? String(section.section_type) : "";
      const isRawHtmlSection = sectionTypeRaw.toLowerCase().includes("raw_html");
      const rawHtmlContent = isRawHtmlSection
        ? (section?.raw_html?.html_content != null ? String(section.raw_html.html_content) : "")
        : "";

      let questions = [];
      const isMultipleChoiceMultipleAnswers = sectionTypeRaw
        .toLowerCase()
        .includes("multiple_choice_multiple_answers");
      const isDragAndDropSection = sectionTypeRaw
        .toLowerCase()
        .includes("drag_and_drop");

      let resolvedInstruction = section?.instructions || "Answer the questions below.";

      if (isDragAndDropSection) {
        const sourceQuestions = asArray(section?.questions)
          .slice()
          .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));

        const numberedQuestions = sourceQuestions.map((question) => {
          const number = questionNumber;
          questionNumber += 1;

          const rawAnswer =
            question?.correct_answer ||
            question?.answer ||
            question?.correct ||
            "";
          answersByQuestionNumber[number] = String(rawAnswer || "");

          return {
            number,
            text: question?.question_text || `Question ${number}`,
          };
        });

        const sectionStart = numberedQuestions[0]?.number ?? startNumber;
        const sectionEnd = numberedQuestions[numberedQuestions.length - 1]?.number ?? sectionStart;

        questions = [{
          number: sectionStart === sectionEnd ? sectionStart : `${sectionStart}-${sectionEnd}`,
          type: "drag_and_drop",
          text: section?.instructions || "",
          options: asArray(section?.list_selections).map(toOptionData),
          individualQuestions: numberedQuestions,
        }];
      } else if (isMultipleChoiceMultipleAnswers) {
        const sourceQuestions = asArray(section?.questions);
        const numberedQuestions = sourceQuestions.map((question) => {
          const number = questionNumber;
          questionNumber += 1;

          const rawAnswer =
            question?.correct_answer ||
            question?.answer ||
            question?.correct ||
            "";
          answersByQuestionNumber[number] = String(rawAnswer || "");

          return { number };
        });

        const sectionStart = numberedQuestions[0]?.number ?? startNumber;
        const sectionEnd = numberedQuestions[numberedQuestions.length - 1]?.number ?? sectionStart;
        const promptRaw = section?.multiple_choice_multiple_answers?.question_text;
        const prompt = typeof promptRaw === "string" && promptRaw.trim()
          ? promptRaw.trim()
          : (section?.instructions || `Choose answers for questions ${sectionStart}-${sectionEnd}.`);

        // Prompt is shown once as section instruction (HTML ok); avoid duplicate under Part title in MultipleChoiceTwo.
        resolvedInstruction = prompt;
        questions = [{
          number: sectionStart === sectionEnd ? sectionStart : `${sectionStart}-${sectionEnd}`,
          type: "multiple_choice_two",
          text: ".",
          options: asArray(section?.list_selections).map(toOptionData),
        }];
      } else {
        questions = asArray(section?.questions).map((question) => {
          const number = questionNumber;
          questionNumber += 1;

          const type = mapListeningType(section?.section_type, question);
          const rawText = question?.question_text;
          const text = isPlaceholderQuestionText(rawText)
            ? `Question ${number} _________`
            : (rawText || `Question ${number} _________`);
          const base = {
            number,
            type,
            text,
          };

          if (type === "multiple_choice" || type === "multiple_choice_two") {
            base.options = asArray(question?.options).map(toOptionData);
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
      }

      const sectionNumbers = questions.flatMap((question) =>
        parseQuestionNumberRange(question?.number)
      );
      const start = sectionNumbers.length ? Math.min(...sectionNumbers) : startNumber;
      const end = sectionNumbers.length ? Math.max(...sectionNumbers) : start;

      return {
        questionRange: `${start}-${end}`,
        instruction: resolvedInstruction,
        context: section?.title || (sectionIndex === 0 ? `Part ${partIndex + 1}` : ""),
        options_box: asArray(section?.options).map(toOptionData),
        rawHtmlContent,
        questions,
      };
    });

    const endNumber = questionNumber - 1;
    const hasQuestions = endNumber >= startNumber;

    return {
      part: Number(part?.part) || partIndex + 1,
      questionRange: hasQuestions ? `${startNumber}-${endNumber}` : `${startNumber}-${startNumber}`,
      audioUrl: part?.audio_file || part?.audio_link || "",
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

      if (type === "multiple_choice_multiple") {
        const selections = asArray(section?.list_selections).map((selection, index) =>
          toOptionData(selection, index)
        );
        const sectionQuestionText = section?.multiple_choice_multiple_answers?.question_text;
        const prompt = (typeof sectionQuestionText === "string" && sectionQuestionText.trim())
          ? sectionQuestionText.trim()
          : (section?.instructions || "");
        const maxSelections = Math.max(1, sourceQuestions.length || selections.length || 1);

        return [{
          id: questionId++,
          type,
          instruction: section?.instructions || "",
          question: prompt,
          options: selections,
          maxSelections,
        }];
      }

      if (type === "multiple_choice" || type === "true_false_not_given" || type === "yes_no_not_given") {
        return sourceQuestions.map((question) => ({
          id: questionId++,
          type,
          question: question?.question_text || question?.text || "",
          statement: question?.question_text || question?.text || "",
          options: asArray(question?.options).length
            ? asArray(question.options).map(toOptionData)
            : type.includes("true_false")
              ? ["TRUE", "FALSE", "NOT GIVEN"]
              : [],
        }));
      }

      if (type === "matching_headings") {
        const selectionOptions = asArray(section?.list_selections).map(toReadingSelection);
        const headings = selectionOptions.map((opt) => ({
          value: opt.value,
          label: opt.label,
          text: opt.text || opt.label,
        }));
        const sortedQuestions = sourceQuestions
          .slice()
          .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
        const placeholdersFromText = extractQuestionPlaceholders(passage?.text);
        const placeholderIds = placeholdersFromText.length
          ? placeholdersFromText
          : sortedQuestions.map((_, idx) => String(idx + 1));
        const renderInPassage = placeholdersFromText.length > 0 && selectionOptions.length > 0;

        const placeholderMap = {};
        placeholderIds.forEach((placeholderId, idx) => {
          const sourceQuestion = sortedQuestions[idx];
          placeholderMap[placeholderId] = {
            key: String(placeholderId),
            sourceQuestionId: sourceQuestion?.id ?? null,
            sourceOrder: sourceQuestion?.order ?? null,
          };
        });

        const answers = sortedQuestions
          .map((q, idx) => {
            const placeholderId = placeholderIds[idx];
            const correct = q?.correct_answer ?? q?.answer ?? q?.correct ?? null;
            if (!placeholderId || correct == null || String(correct).trim() === "") return null;
            return {
              section: String(placeholderId),
              answer: String(correct).trim(),
            };
          })
          .filter(Boolean);

        return [{
          id: questionId++,
          type,
          instruction: section?.instructions || "Match headings.",
          sections: placeholderIds,
          headings,
          options: headings,
          dragOptions: selectionOptions,
          renderInPassage,
          placeholderMap,
          answers,
        }];
      }

      if (type === "matching_information") {
        const sortedQuestions = sourceQuestions
          .slice()
          .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
        const options = buildMatchingInformationOptions(section, passage?.text);

        return [{
          id: questionId++,
          type,
          instruction: section?.instructions || "Match information.",
          information: sortedQuestions.map((q, idx) => {
            const resolvedOrder = Number.isFinite(Number(q?.order))
              ? Number(q.order)
              : (idx + 1);
            const text = q?.question_text || `Information ${resolvedOrder}`;
            return `${resolvedOrder}. ${text}`;
          }),
          options,
        }];
      }

      if (type === "matching_people") {
        const sortedQuestions = sourceQuestions
          .slice()
          .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
        const options = asArray(section?.list_selections).map((selection, index) =>
          toOptionData(selection, index)
        );

        const statements = sortedQuestions.map((q, idx) => {
          const resolvedOrder = Number.isFinite(Number(q?.order))
            ? Number(q.order)
            : (idx + 1);
          const text = q?.question_text || `Statement ${resolvedOrder}`;
          return `${resolvedOrder}. ${text}`;
        });

        const answers = sortedQuestions
          .map((q, idx) => {
            const resolvedOrder = Number.isFinite(Number(q?.order))
              ? Number(q.order)
              : (idx + 1);
            const text = q?.question_text || `Statement ${resolvedOrder}`;
            const statement = `${resolvedOrder}. ${text}`;
            const answerValue = q?.correct_answer ?? q?.answer ?? q?.correct ?? null;
            if (answerValue == null || String(answerValue).trim() === "") return null;
            return {
              statement,
              answer: String(answerValue).trim().toUpperCase(),
            };
          })
          .filter(Boolean);

        return [{
          id: questionId++,
          type,
          instruction: section?.instructions || "Match each statement with the correct person.",
          statements,
          options,
          people: options,
          answers,
        }];
      }

      if (type === "matching_features") {
        return [{
          id: questionId++,
          type,
          instruction: section?.instructions || "Match features.",
          features: sourceQuestions.map((q, idx) => `${idx + 1}. ${q?.question_text || `Feature ${idx + 1}`}`),
          items: sourceQuestions[0]?.options?.length
            ? sourceQuestions[0].options.map(toOptionData)
            : [],
        }];
      }

      if (type === "matching_sentences") {
        const items = sourceQuestions
          .slice()
          .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
          .map((question) => ({
            id: Number(question?.id) || null,
            order: Number(question?.order) || null,
            text: question?.question_text || question?.text || "",
          }));

        const options = asArray(section?.list_selections)
          .map((selection, index) => toOptionData(selection, index))
          .filter(Boolean);

        const numericOrders = items
          .map((item) => item.order)
          .filter((order) => Number.isFinite(order));
        const minOrder = numericOrders.length ? Math.min(...numericOrders) : null;

        return [{
          id: questionId++,
          type,
          instruction: section?.instructions || "",
          items,
          options,
          list_selections: asArray(section?.list_selections),
          order: minOrder ?? (Number(section?.order) || null),
        }];
      }

      if (type === "sentence_completion") {
        return [{
          id: questionId++,
          type,
          instruction: section?.instructions || "Complete the sentences.",
          sentences: sourceQuestions.map((q, idx) => `${idx + 1}. ${q?.question_text || ""}`),
          endings: sourceQuestions[0]?.options?.length
            ? sourceQuestions[0].options.map(toOptionData)
            : [],
        }];
      }

      if (type === "summary_completion") {
        const summaryText =
          section?.summary_completion?.text ??
          section?.summary_completion?.summary ??
          "";

        return [{
          id: questionId++,
          type,
          instruction: section?.instructions || "Complete the summary.",
          title: section?.summary_completion?.title || "",
          summary: normalizeCompletionPlaceholders(summaryText),
          answers: toCompletionAnswers(sourceQuestions),
        }];
      }

      return [{
        id: questionId++,
        type: "short_answer",
        instruction: section?.instructions || "Answer the questions.",
        questions: sourceQuestions.map((q, idx) => `${idx + 1}. ${q?.question_text || ""}`),
      }];
    });

    const subtopicRaw =
      passage?.subtopic != null && String(passage.subtopic).trim()
        ? String(passage.subtopic).trim()
        : "";
    const subtopic = subtopicRaw === "---" ? "" : subtopicRaw;

    return {
      passage_id: passageIndex + 1,
      title: passage?.title || `Reading passage ${passageIndex + 1}`,
      topic: passage?.topic || "",
      subtopic,
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
  const task1Text = task1?.question_text ? String(task1.question_text).trim() : "";
  const task2Text = task2?.question_text ? String(task2.question_text).trim() : "";

  const tasks = [];

  if (task1Text) {
    tasks.push({
      id: Number(task1?.id) || 1,
      part: 1,
      taskNumber: Number(task1?.task_number) || 1,
      questionText: task1Text,
      images: normalizeWritingImages(task1),
      minWords: 150,
      recommendedMinutes: 20,
    });
  }

  if (task2Text) {
    tasks.push({
      id: Number(task2?.id) || 2,
      part: 2,
      taskNumber: Number(task2?.task_number) || 2,
      questionText: task2Text,
      images: normalizeWritingImages(task2),
      minWords: 250,
      recommendedMinutes: 40,
    });
  }

  const topicFallback = task1Text || task2Text || `Mock ${mockId} Writing Task`;

  return {
    id: mockId,
    topic: topicFallback,
    tasks,
    relatedVocabulary: [],
  };
}
