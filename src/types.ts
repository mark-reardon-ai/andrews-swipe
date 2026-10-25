export type Person = 'tom' | 'jane';
export type AppPerson = Person | 'both' | 'mark';
type SchemaPerson = Person | 'mark' | 'engineer' | 'contractor' | 'town' | 'other';
type Realism = 'concept' | 'photoreal_textures' | 'photoreal_products';
export interface Implication {
  summary: string;
  sets?: {
    decision: string;
    value: unknown;
  }[];
  eliminates?: string[];
  follow_up?: string;
}
export interface CardImage {
  file: string;
  file_b?: string;
  alt: string;
  width?: number;
  height?: number;
  room?: string;
  camera?: string;
  realism?: Realism;
  generator?: {
    tool?: 'gemini' | 'model_render' | 'photo' | 'other';
    account?: string;
    generated_at?: string;
    prompt_file?: string;
    references?: {
      kind: 'photo' | 'model_render' | 'product' | 'swatch' | 'previous_card';
      ref: string;
      note?: string;
    }[];
  };
  x_webp?: Record<string, string>;
  x_webp_b?: Record<string, string>;
  fit?: 'cover' | 'contain';
}
export interface Card {
  id: string;
  kind: 'anchor_now' | 'option' | 'compare' | 'detail' | 'picks_so_far';
  image: CardImage;
  question: string;
  detail?: string;
  option_tags?: string[];
  decision?: string;
  option?: string;
  gives_up_vs_expansion?: string;
  yes: Implication;
  no: Implication;
  show_if?: {
    decision: string;
    equals?: unknown;
    in?: unknown[];
    not?: unknown;
    status?: 'proposed' | 'locked';
  }[];
  order?: number;
}
export interface Deck {
  format: '31andrews.swipe_deck/1';
  deck_id: string;
  round: string;
  version: number;
  created: string;
  realism: Realism;
  audience?: AppPerson[];
  intro?: string;
  generated_from?: string;
  cards: Card[];
  session_size?: number;
}
export interface SwipeAnswer {
  card_id: string;
  swipe: 'yes' | 'no' | 'skip';
  strength?: 1 | 2 | 3;
  note?: string;
  at: string;
  dwell_ms?: number;
  revisited?: boolean;
}
export interface Sitting {
  started: string;
  finished?: string;
  cards: string[];
}
export interface SwipeAnswersFile {
  format: '31andrews.swipe_answers/1';
  deck_id: string;
  deck_version?: number;
  person: SchemaPerson;
  session?: {
    started?: string;
    finished?: string;
    device?: string;
    app_version?: string;
  };
  answers: SwipeAnswer[];
  favorites?: string[];
  x_joint?: boolean;
  x_people?: Person[];
  x_test?: boolean;
  x_round?: string;
  x_sessions?: Sitting[];
  x_removed?: Record<string, string>;
}
export interface Round {
  round: string;
  deck: string;
  title: string;
  session_size?: number;
  status: 'open' | 'closed';
  published: string;
}
export interface Rounds {
  format: '31andrews.swipe_rounds/1';
  current: string;
  answers_endpoint?: string;
  admin_key?: string;
  rounds: Round[];
}
export const sectionOf = (card: Card) => card.option_tags?.find(t => t.startsWith('section:') && t.length > 8)?.slice(8) ?? card.kind;
export const imageSrcSet = (image: CardImage, second = false) => {
  const sources = second ? image.x_webp_b : image.x_webp;
  return sources ? Object.entries(sources).map(([w, path]) => `${path} ${w}w`).join(', ') : undefined;
};
