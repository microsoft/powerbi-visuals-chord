import powerbi from "powerbi-visuals-api";
import { Selection, select as d3Select } from "d3-selection";
import { Chord, Chords } from "d3-chord";
import { ChordArcDescriptor } from './interfaces';
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;

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
    highlightsMatrix: number[][];
}

export class Behavior {
    public static readonly FullOpacity: number = 1;
    public static readonly DimmedOpacity: number = 0.3;

    private selectionManager: ISelectionManager;
    private options: BehaviorOptions;

    constructor(selectionManager: ISelectionManager) {
        this.selectionManager = selectionManager;
    }

    public bindEvents(options: BehaviorOptions): void {
        this.options = options;

        this.bindClick();
        this.bindContextMenu();
        this.bindContextMenuToClearCatcher();
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
        this.renderSelectionAndHighlights();
    }

    private clear(): void {
        this.selectionManager.clear();
        this.renderSelectionAndHighlights();
    }

    public renderSelectionAndHighlights(): void {
        this.syncSelectionState();
        if (this.hasSelection || this.options.hasHighlights) {
            this.renderDataPoints();
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

    private isDataPointSelected(dataPoint: SelectableDataPoint, selectedIds: ISelectionId[]): boolean {
        return selectedIds.some((value: ISelectionId) => value.equals(<ISelectionId>dataPoint.identity));
    }

    private renderDataPoints(): void {
        const { arcSelection, chordSelection } = this.options;
        const arcs: ChordArcDescriptor[] = <ChordArcDescriptor[]>arcSelection.data();
        const chords: Chords = <Chords>chordSelection.data();

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

        chordSelection.each((chordLink: Chord, chordIndex: number, nodes: HTMLElement[]) => {
            const chordPoint = d3Select(nodes[chordIndex]);
            const chordArcs: ChordArcDescriptor[] = arcs.filter((arc: ChordArcDescriptor) => arc.index === chordLink.source.index || arc.index === chordLink.target.index);

            const isChordHighlighted = this.options.highlightsMatrix[chordLink.source.index][chordLink.target.index] > 0;
            if (isChordHighlighted) {
                chordPoint.style("opacity", Behavior.FullOpacity);
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
        });
    }

    private renderClearSelection(): void {
        const { arcSelection, chordSelection } = this.options;
        arcSelection.style("opacity", Behavior.FullOpacity);
        chordSelection.style("opacity", Behavior.FullOpacity);
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