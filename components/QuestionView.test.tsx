import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuestionView } from "./QuestionView";
import { getDictionary } from "@/lib/i18n";
import type { QuestionDTO } from "@/lib/dto";

const submitAnswerMock = vi.fn();
vi.mock("@/app/actions/answer", () => ({
  submitAnswer: (...args: unknown[]) => submitAnswerMock(...args),
}));

const question: QuestionDTO = {
  id: "q1",
  number: 4,
  slug: "abc234567",
  text: "Kolik vody vyteče za jeden den z kapajícího kohoutku?",
  option1: "1 litr",
  option2: "15 litrů",
  option3: "100 litrů",
};

const dict = getDictionary("cs");

describe("QuestionView", () => {
  it("never renders correctOption anywhere in the DOM, in any state", () => {
    const { container } = render(
      <QuestionView question={question} dict={dict} answeredCount={3} totalQuestions={30} existingAnswer={null} />
    );
    expect(container.innerHTML).not.toContain("correctOption");
  });

  it("state A: submit is disabled until an answer is selected, then requires confirmation", async () => {
    submitAnswerMock.mockResolvedValue({ status: "saved", answeredCount: 4, totalQuestions: 30 });

    render(<QuestionView question={question} dict={dict} answeredCount={3} totalQuestions={30} existingAnswer={null} />);

    const submitButton = screen.getByRole("button", { name: dict.question.submitButton });
    expect(submitButton).toBeDisabled();

    fireEvent.click(screen.getByText("15 litrů"));
    expect(submitButton).not.toBeDisabled();

    fireEvent.click(submitButton);
    // Vyžaduje dvojí potvrzení — bottom sheet s Zrušit/Odeslat.
    expect(screen.getByText(dict.question.confirmTitle)).toBeInTheDocument();
    expect(submitAnswerMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: dict.question.confirmSubmit }));

    await waitFor(() => expect(submitAnswerMock).toHaveBeenCalledWith("abc234567", 2));
    await waitFor(() =>
      expect(
        screen.getByText((_, el) => el?.textContent === "Odpověď uložena. Máš zodpovězeno 4 z 30 otázek.")
      ).toBeInTheDocument()
    );
    expect(screen.getByText(dict.question.resultsNotice)).toBeInTheDocument();
    expect(screen.getByText(dict.question.savedHint)).toBeInTheDocument();
  });

  it("state B: already answered shows the locked selection without revealing correctness", () => {
    render(
      <QuestionView
        question={question}
        dict={dict}
        answeredCount={4}
        totalQuestions={30}
        existingAnswer={{ selectedOption: 1 }}
      />
    );
    expect(screen.getByText(dict.question.alreadyAnsweredTitle)).toBeInTheDocument();
    const options = screen.getAllByRole("radio");
    expect(options.find((o) => o.getAttribute("aria-checked") === "true")).toHaveTextContent("1 litr");
    expect(options.every((o) => o.hasAttribute("disabled"))).toBe(true);
  });

  it("handles the race condition where the server reports already_answered on submit", async () => {
    submitAnswerMock.mockResolvedValue({ status: "already_answered", answeredCount: 4, totalQuestions: 30 });

    render(<QuestionView question={question} dict={dict} answeredCount={3} totalQuestions={30} existingAnswer={null} />);

    fireEvent.click(screen.getByText("1 litr"));
    fireEvent.click(screen.getByRole("button", { name: dict.question.submitButton }));
    fireEvent.click(screen.getByRole("button", { name: dict.question.confirmSubmit }));

    await waitFor(() => expect(screen.getByText(dict.question.alreadyAnsweredTitle)).toBeInTheDocument());
  });

  it("shows the completion message instead of the per-question hint once the last question is answered", async () => {
    submitAnswerMock.mockResolvedValue({ status: "saved", answeredCount: 30, totalQuestions: 30 });

    render(<QuestionView question={question} dict={dict} answeredCount={29} totalQuestions={30} existingAnswer={null} />);

    fireEvent.click(screen.getByText("1 litr"));
    fireEvent.click(screen.getByRole("button", { name: dict.question.submitButton }));
    fireEvent.click(screen.getByRole("button", { name: dict.question.confirmSubmit }));

    await waitFor(() => expect(screen.getByText(dict.question.allDoneTitle)).toBeInTheDocument());
    expect(screen.getByText(dict.question.allDoneBody)).toBeInTheDocument();
    expect(screen.queryByText(dict.question.savedHint)).not.toBeInTheDocument();
  });

  it("shows the completion message (not 'find the next QR code') when revisiting an answered question after finishing all of them", () => {
    render(
      <QuestionView
        question={question}
        dict={dict}
        answeredCount={30}
        totalQuestions={30}
        existingAnswer={{ selectedOption: 1 }}
      />
    );
    expect(screen.getByText(dict.question.alreadyAnsweredTitle)).toBeInTheDocument();
    expect(screen.getByText(dict.question.allDoneBody)).toBeInTheDocument();
    expect(screen.queryByText(dict.question.alreadyAnsweredHint)).not.toBeInTheDocument();
  });

  it("shrinks the font size for long question text so it doesn't dominate the screen", () => {
    const longQuestion: QuestionDTO = {
      ...question,
      text: "The Paris Climate Agreement of 2015. You have certainly heard of it. But do you know what its main commitment was? The countries that ratified it pledged to do everything possible to ensure that, by the end of the 21st century, the global average temperature would not rise by more than:",
    };
    render(<QuestionView question={longQuestion} dict={dict} answeredCount={3} totalQuestions={30} existingAnswer={null} />);
    const textEl = screen.getByText(longQuestion.text);
    expect(textEl.className).toContain("text-base");
    expect(textEl.className).not.toContain("text-xl");
  });

  it("keeps the default larger font size for short question text", () => {
    render(<QuestionView question={question} dict={dict} answeredCount={3} totalQuestions={30} existingAnswer={null} />);
    const textEl = screen.getByText(question.text);
    expect(textEl.className).toContain("text-xl");
  });
});
