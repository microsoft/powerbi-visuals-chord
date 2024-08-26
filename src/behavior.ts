import powerbi from "powerbi-visuals-api";
import { Selection, select as d3Select } from "d3-selection";
import { Chord, Chords } from "d3-chord";
import { ChordArcDescriptor } from './interfaces';
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;
import { LegendDataPoint } from "powerbi-visuals-utils-chartutils/lib/legend/legendInterfaces";

export interface BaseDataPoint {
    selected: boolean;
}

export interface SelectableDataPoint extends BaseDataPoint {
    identity: ISelectionId;
    specificIdentity?: ISelectionId;
}

export interface BehaviorOptions {
    clearCatcherSelection: Selection<any, any, any, any>;
    arcSelection: Selection<any, ChordArcDescriptor, any, any>;
    chordSelection: Selection<any, Chord, any, any>;
    dataPoints: SelectableDataPoint[];
    hasHighlights: boolean;
    hasHighlightsObject: boolean;
    highlightsMatrix: number[][];
}

export interface HighlightedChord extends Chord {
    hasHighlight: boolean;
}

export interface ChordsHighlighted extends Chords {
    highlightedChords: HighlightedChord[];
}

export class Behavior {
    public static readonly FullOpacity: number = 1;
    public static readonly DimmedOpacity: number = 0.3;

    private selectionManager: ISelectionManager;
    private options: BehaviorOptions;

    constructor(selectionManager: ISelectionManager) {
        this.selectionManager = selectionManager;
        this.selectionManager.registerOnSelectCallback(this.onSelectCallback.bind(this));
    }

    public bindEvents(options: BehaviorOptions): void {
        this.options = options;

        this.bindClick();
        this.bindContextMenu();
        this.bindContextMenuToClearCatcher();
        this.bindKeyboardEvents();
    }

    private bindClick(): void {
        this.options.arcSelection.on("click", (event: MouseEvent, dataPoint: ChordArcDescriptor) => {
            event.stopPropagation();
            this.selectDataPoint(dataPoint, event.ctrlKey || event.metaKey || event.shiftKey);
        });

        this.options.clearCatcherSelection.on("click", () => {
            this.clear();
        });
    }

    private bindContextMenu(): void {
        this.options.arcSelection.on("contextmenu", (event: MouseEvent, dataPoint: ChordArcDescriptor) => {
            this.selectionManager.showContextMenu(dataPoint && dataPoint.identity ? dataPoint.identity : {}, {
                x: event.clientX,
                y: event.clientY,
            });

            event.preventDefault();
            event.stopPropagation();
        });
    }

    private bindContextMenuToClearCatcher(): void {
        this.options.clearCatcherSelection.on("contextmenu", (event: MouseEvent) => {
            this.selectionManager.showContextMenu({}, {
                x: event.clientX,
                y: event.clientY,
            });

            event.preventDefault();
            event.stopPropagation();
        });
    }

    private bindKeyboardEvents(): void {
        this.options.arcSelection.on("keydown", (event: KeyboardEvent, dataPoint: ChordArcDescriptor) => {
            if (event.code === "Enter" || event.code === "Space") {
                this.selectDataPoint(dataPoint, event.ctrlKey || event.metaKey || event.shiftKey);
            }
        });
    }

    private get hasSelection(): boolean {
        const selectionIds = this.selectionManager.getSelectionIds();
        return selectionIds.length > 0;
    }

    private selectDataPoint(dataPoint: SelectableDataPoint, multiSelect: boolean): void {
        if (!dataPoint) {
            return;
        }

        const selectionIdsToSelect: ISelectionId[] = [dataPoint.identity];
        this.selectionManager.select(selectionIdsToSelect, multiSelect);
        this.onSelectCallback();
    }

    private clear(): void {
        this.selectionManager.clear();
        this.onSelectCallback();
    }

    private setSelectedToDataPoints(dataPoints: SelectableDataPoint[] | LegendDataPoint[], ids?: ISelectionId[], hasHighlightsParameter?: boolean): void {
        const selectedIds: ISelectionId[] = ids || <ISelectionId[]>this.selectionManager.getSelectionIds();
        const hasHighlights: boolean = hasHighlightsParameter || (this.options && this.options.hasHighlights);

        if (hasHighlights && this.hasSelection) {
            this.selectionManager.clear();
        }

        for (const dataPoint of dataPoints) { 
            dataPoint.selected = this.isDataPointSelected(dataPoint, selectedIds);
        }
    }

    public syncAndRender(): void {
        this.onSelectCallback();
    }

    private onSelectCallback(selectionIds?: ISelectionId[]): void {
        const selectedIds: ISelectionId[] = selectionIds || <ISelectionId[]>this.selectionManager.getSelectionIds();
        this.setSelectedToDataPoints(this.options.dataPoints, selectedIds);
        this.renderSelectionAndHighlights();
    }

    private renderSelectionAndHighlights(): void {
        if (this.hasSelection || this.options.hasHighlights) {
            this.renderDataPoints();
        } else if (!this.hasSelection && !this.options.hasHighlights && this.options.hasHighlightsObject) {
            this.renderEmptyHighlights();
        } else {
            this.renderClearSelection();
        }
    }

    public syncSelectionState(): void {
        const selectedIds: ISelectionId[] = <ISelectionId[]>this.selectionManager.getSelectionIds();
        for (const dataPoint of this.options.dataPoints) { 
            dataPoint.selected = this.isDataPointSelected(dataPoint, selectedIds);
        }
    }

    private isDataPointSelected(dataPoint: SelectableDataPoint | LegendDataPoint, selectedIds: ISelectionId[]): boolean {
        return selectedIds.some((value: ISelectionId) => value.equals(<ISelectionId>dataPoint.identity));
    }

    private renderDataPoints(): void {
        const { arcSelection, chordSelection } = this.options;
        const arcs: ChordArcDescriptor[] = <ChordArcDescriptor[]>arcSelection.data();
        const chords: ChordsHighlighted = <ChordsHighlighted>chordSelection.data();

        arcSelection.each((arc: ChordArcDescriptor, arcIndex: number, nodes: HTMLElement[]) => {
            const arcPoint = d3Select(nodes[arcIndex]);

            let arcOpacity: number;
            if (arc.selected) {
                arcOpacity = Behavior.FullOpacity;
            } else if (this.options.hasHighlights && this.isArcHighlighted(chords, arcIndex)) {
                arcOpacity = Behavior.FullOpacity;
            } else {
                arcOpacity = Behavior.DimmedOpacity;
            }
            arcPoint.style("opacity", arcOpacity);
        });

        chordSelection.each((chordLink: HighlightedChord, chordIndex: number, nodes: HTMLElement[]) => {
            const chordPoint = d3Select(nodes[chordIndex]);
            const chordArcs: ChordArcDescriptor[] = arcs.filter((arc: ChordArcDescriptor) => arc.index === chordLink.source.index || arc.index === chordLink.target.index);

            const isChordHighlighted = this.options.highlightsMatrix[chordLink.source.index][chordLink.target.index] > 0;
            if (isChordHighlighted) {
                chordPoint.style("opacity", Behavior.FullOpacity);
                chordLink.hasHighlight = true;
                return;
            }

            let isChordSelected = false;
            for (const arc of chordArcs) {
                isChordSelected = arc.selected && (chordLink.source.index === arc.index || chordLink.target.index === arc.index);
                if (isChordSelected) {
                    break;
                }
            }
            chordPoint.style("opacity", isChordSelected ? Behavior.FullOpacity : Behavior.DimmedOpacity)
            chordLink.hasHighlight = isChordHighlighted || isChordSelected;
        });
    }

    private renderClearSelection(): void {
        const { arcSelection, chordSelection } = this.options;
        arcSelection.style("opacity", Behavior.FullOpacity);
        chordSelection.style("opacity", Behavior.FullOpacity);
    }

    private renderEmptyHighlights(): void {
        const { arcSelection, chordSelection } = this.options;
        arcSelection.style("opacity", Behavior.DimmedOpacity);
        chordSelection.style("opacity", Behavior.DimmedOpacity);
    }


    private isArcHighlighted(chords: Chords, arcIndex: number): boolean {
        const arcChords = chords.filter((chordLink: Chord) => chordLink.source.index === arcIndex || chordLink.target.index === arcIndex);
        if (arcChords.length === 0) {
            return false;
        }

        for (const chord of arcChords) {
            const highlightValue = this.options.highlightsMatrix[chord.source.index][chord.target.index];
            if (highlightValue <= 0) {
                return false;
            }
        }
        return true;
    }
}