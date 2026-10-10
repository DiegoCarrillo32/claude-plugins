import type * as React from 'react';

/** A crab's costume, and the prop it animates. */
export type Costume = 'astronaut' | 'detective' | 'engineer' | 'chef' | 'racer';
/** What a crab is doing. `costume` draws the look's own costume. */
export type Pose = 'walk' | 'done' | 'failed' | 'sleep' | 'costume' | Costume;
export type PaletteName = 'Clawd' | 'Amber' | 'Sand' | 'Moss' | 'Sage' | 'Jade' | 'Teal' | 'Sky' | 'Periwinkle' | 'Lavender' | 'Plum' | 'Rose' | 'Cherry' | 'Cocoa' | 'Slate' | 'Graphite';
export type EyeName = 'classic' | 'wide' | 'sparkly' | 'beady' | 'side-eye' | 'happy' | 'sleepy' | 'determined' | 'tall' | 'glint';
export type MarkingName = 'plain' | 'freckles' | 'underside' | 'stripes' | 'spots' | 'cap' | 'cheeks' | 'claws' | 'peak' | 'patch' | 'mottled';
/** What makes one crab itself. Indices or names. A string is a seed: the same seed always draws the same crab. Omitted: Clawd. */
export type CrabLook = string | null | { palette?: number | PaletteName; eye?: number | EyeName; texture?: number | MarkingName; tier?: Costume; name?: string };
/** A crop of the 32x20 art grid. `body` is the band's head-and-shoulders, `portrait` the roll-call crop. */
export type Crop = 'full' | 'body' | 'portrait' | { top: number; rows: number; left: number; cols: number };
export type Tone = 'neutral' | 'clawd' | 'success' | 'danger' | 'warning' | 'info';
/** A crab palette (look, name or index) or explicit colors, for frames and bars. */
export type CrabColor = CrabLook | number | PaletteName | { body: string; light?: string; shade?: string };

export interface CrabProps { look?: CrabLook; pose?: Pose; moving?: boolean; lane?: number; scale?: number; still?: boolean; ghost?: boolean; ground?: boolean; crop?: Crop; offset?: number; restyleEyes?: boolean; alt?: string; className?: string; style?: React.CSSProperties }
export declare function Crab(props: CrabProps): React.ReactElement;
export interface CrabPileProps { looks: CrabLook[]; scale?: number; alt?: string; className?: string }
export declare function CrabPile(props: CrabPileProps): React.ReactElement;
export interface SpeechBubbleProps { look?: CrabLook; pose?: Pose; speaker?: string | false; still?: boolean; live?: boolean; children?: React.ReactNode; className?: string }
export declare function SpeechBubble(props: SpeechBubbleProps): React.ReactElement;
export interface EmptyStateProps { look?: CrabLook; pose?: Pose; title?: React.ReactNode; action?: React.ReactNode; still?: boolean; children?: React.ReactNode; className?: string }
export declare function EmptyState(props: EmptyStateProps): React.ReactElement;

export interface PixelBarProps { done: number; total: number; active?: number; working?: boolean; height?: number; color?: CrabColor; label?: string; className?: string }
export declare function PixelBar(props: PixelBarProps): React.ReactElement;
export interface ProgressBandProps { title: React.ReactNode; phase?: React.ReactNode; done: number; total: number; active?: number; working?: boolean; label?: string; crew?: CrabLook[]; onCrew?: () => void; className?: string }
export declare function ProgressBand(props: ProgressBandProps): React.ReactElement;

export interface CrewCardProps { look: CrabLook; costume?: Costume; role?: React.ReactNode; elapsed?: string; description: React.ReactNode; activity?: React.ReactNode; facts?: React.ReactNode[]; moving?: boolean; className?: string }
export declare function CrewCard(props: CrewCardProps): React.ReactElement;
export interface CrewRowProps { status: 'planned' | 'done' | 'failed'; look: CrabLook; description: React.ReactNode; facts?: React.ReactNode[]; className?: string }
export declare function CrewRow(props: CrewRowProps): React.ReactElement;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary' | 'secondary' | 'quiet'; size?: 'sm' | 'md'; icon?: React.ReactNode }
export declare function Button(props: ButtonProps): React.ReactElement;
export interface PanelProps { tone?: 'plain' | 'clawd'; edge?: CrabColor; label?: string; children?: React.ReactNode; className?: string; style?: React.CSSProperties }
export declare function Panel(props: PanelProps): React.ReactElement;
export interface TabsProps { items: { id: string; label: React.ReactNode; count?: number }[]; value: string; onChange?: (id: string) => void; label?: string; className?: string }
export declare function Tabs(props: TabsProps): React.ReactElement;

export interface SectionLabelProps { count?: number; children?: React.ReactNode; className?: string }
export declare function SectionLabel(props: SectionLabelProps): React.ReactElement;
export interface FactsProps { items: React.ReactNode[]; className?: string }
export declare function Facts(props: FactsProps): React.ReactElement;
export interface ChipProps { tone?: Tone; dot?: boolean; children?: React.ReactNode; className?: string }
export declare function Chip(props: ChipProps): React.ReactElement;

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: React.ReactNode; hint?: React.ReactNode; error?: React.ReactNode }
export declare function TextField(props: TextFieldProps): React.ReactElement;
export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> { label: React.ReactNode }
export declare function Checkbox(props: CheckboxProps): React.ReactElement;

export type IconName = 'check' | 'close' | 'plus' | 'minus' | 'arrow-right' | 'arrow-left' | 'arrow-up' | 'arrow-down' | 'play' | 'pause' | 'clock' | 'search' | 'info' | 'alert' | 'star' | 'heart' | 'wave' | 'shell';
export interface PixelIconProps { name: IconName; size?: number; label?: string; className?: string }
export declare function PixelIcon(props: PixelIconProps): React.ReactElement | null;

/** The crab engine, for drawing crabs outside React (canvas, CSS backgrounds, other frameworks). */
export interface CrabEngine {
  TIERS: Costume[]; CLAWD: CrabLook; palettes: { name: PaletteName; body: string; shade: string }[]; eyes: EyeName[]; textures: MarkingName[]; names: string[]; poses: Pose[];
  pickLook(seed: string, taken?: CrabLook[]): Exclude<CrabLook, string | null>;
  lookColor(look: CrabLook): { name: string; body: string; light: string; shade: string };
  crabSvg(look: CrabLook, o?: { pose?: Pose; lane?: number; scale?: number; moving?: boolean; still?: boolean; ghost?: boolean; ground?: boolean; crop?: Crop; offset?: number; clock?: number; restyleEyes?: boolean }): string;
  progressSvg(o: { done: number; total: number; active?: number; working?: boolean; width?: number; height?: number; color?: { body: string; light: string; shade: string }; clock?: number }): string;
  pileSvg(looks: CrabLook[], scale?: number): string;
  dataUri(svg: string): string;
}

declare global {
  interface Window {
    CrabCrew: {
      Crab: typeof Crab; CrabPile: typeof CrabPile; SpeechBubble: typeof SpeechBubble; EmptyState: typeof EmptyState;
      PixelBar: typeof PixelBar; ProgressBand: typeof ProgressBand; CrewCard: typeof CrewCard; CrewRow: typeof CrewRow;
      Button: typeof Button; Panel: typeof Panel; Tabs: typeof Tabs; SectionLabel: typeof SectionLabel; Facts: typeof Facts; Chip: typeof Chip;
      TextField: typeof TextField; Checkbox: typeof Checkbox; PixelIcon: typeof PixelIcon;
      crabs: CrabEngine; icons: IconName[];
    };
  }
}
