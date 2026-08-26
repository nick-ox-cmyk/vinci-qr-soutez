import type { Language } from "@prisma/client";

/**
 * Jediné místo, kde se z entity Question/QuestionTranslation skládá objekt
 * pro klienta. `correctOption` sem záměrně nejde předat ani přes Pick<>,
 * takže nemůže „proklouznout" nedopatřením v žádné stránce.
 *
 * @see lib/dto.test.ts — test, který ověří, že korektní odpověď neopustí server.
 */
export interface QuestionDTO {
  id: string;
  number: number;
  slug: string;
  text: string;
  option1: string;
  option2: string;
  option3: string;
}

export function toQuestionDTO(input: {
  id: string;
  number: number;
  slug: string;
  text: string;
  option1: string;
  option2: string;
  option3: string;
}): QuestionDTO {
  return {
    id: input.id,
    number: input.number,
    slug: input.slug,
    text: input.text,
    option1: input.option1,
    option2: input.option2,
    option3: input.option3,
  };
}

export interface EmployeeSearchResultDTO {
  id: string;
  fullName: string;
  companyName: string;
}

export function toEmployeeSearchResultDTO(input: {
  id: string;
  fullName: string;
  companyName: string;
}): EmployeeSearchResultDTO {
  return {
    id: input.id,
    fullName: input.fullName,
    companyName: input.companyName,
  };
}

export interface AnsweredQuestionDTO {
  slug: string;
  number: number;
  selectedOption: number;
  answeredAt: string;
}

export function toAnsweredQuestionDTO(input: {
  slug: string;
  number: number;
  selectedOption: number;
  answeredAt: Date;
}): AnsweredQuestionDTO {
  return {
    slug: input.slug,
    number: input.number,
    selectedOption: input.selectedOption,
    answeredAt: input.answeredAt.toISOString(),
  };
}

export interface ConfirmationDTO {
  employeeId: string;
  fullName: string;
  companyName: string;
  language: Language;
}
