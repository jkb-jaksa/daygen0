export type UseCaseSectionId = "create" | "edit" | "personalize";

export interface UseCaseItem {
  readonly slug: string;
  readonly title: string;
  readonly subtitle: string;
  readonly section: UseCaseSectionId;
}
