import powerbi from "powerbi-visuals-api";
import { Selection } from "d3-selection";
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
    arcSelection: Selection<any, any, any, any>;
    chordSelection: Selection<any, any, any, any>;
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
            this.select(dataPoint, event.ctrlKey || event.metaKey || event.shiftKey);
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

    private select(dataPoints: SelectableDataPoint, multiSelect: boolean): void {
        if (!dataPoints) {
            return;
        }

        const arrayDataPoints = [dataPoints];

        const selectionIdsToSelect: ISelectionId[] = [];
        for (const dataPoint of arrayDataPoints) {
            if (!dataPoint || !dataPoint.identity) {
                continue;
            }

            selectionIdsToSelect.push(dataPoint.identity);
        }

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
        return selectedIds.some((value: ISelectionId) => value.includes(<ISelectionId>dataPoint.identity));
    }

    private renderDataPoints(): void {
        const { arcSelection, chordSelection } = this.options;

        chordSelection.style("opacity", Behavior.DimmedOpacity);

        arcSelection.style("opacity", (arcDescriptor: ChordArcDescriptor, arcIndex: number) => {
            const isArcSelected = arcDescriptor.selected;
            const chords: Chords = <Chords>chordSelection.data();

            chordSelection
                .filter((chordLink: Chord) => {
                    const hasHighlights = this.options.highlightsMatrix[chordLink.source.index][chordLink.target.index] > 0;
                    if (hasHighlights) return true;

                    return (chordLink.source.index === arcIndex && isArcSelected
                        || chordLink.target.index === arcIndex)
                        && isArcSelected;
                })
                .style("opacity", Behavior.FullOpacity)

            if (isArcSelected) {
                return Behavior.FullOpacity;
            }
            if (this.options.hasHighlights && this.isArcHighlighted(chords, arcIndex)) {
                return Behavior.FullOpacity;
            }
            return Behavior.DimmedOpacity;
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