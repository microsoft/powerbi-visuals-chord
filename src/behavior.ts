import powerbi from "powerbi-visuals-api";
import { Selection } from "d3-selection";
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
}

export class Behavior {
    private readonly FullOpacity: number = 1;
    private readonly DimmedOpacity: number = 0.3;

    private selectionManager: ISelectionManager;
    private options: BehaviorOptions;

    constructor(selectionManager: ISelectionManager) {
        this.selectionManager = selectionManager;
    }

    public bindEvents(options: BehaviorOptions): void {
        this.options = options;

        this.bindClick();
        this.bindContextMenu();
        this.bindContextMentToClearCatcher();
    }

    private bindClick() {
        this.options.arcSelection.on("click", (event: MouseEvent, dataPoint: ChordArcDescriptor) => {
            if (!event) {
                return;
            }

            event.stopPropagation();
            this.select(dataPoint, event.ctrlKey || event.metaKey || event.shiftKey);
        });

        this.options.clearCatcherSelection.on("click", () => {
            this.clear();
        });
    }

    private bindContextMenu() {
        this.options.arcSelection.on("contextmenu", (event: MouseEvent, dataPoint: ChordArcDescriptor) => {
            if (!event) {
                return;
            }

            this.selectionManager.showContextMenu(dataPoint && dataPoint.identity ? dataPoint.identity : {}, {
                x: event.clientX,
                y: event.clientY,
            });

            event.preventDefault();
            event.stopPropagation();
        });
    }

    private bindContextMentToClearCatcher() {
        this.options.clearCatcherSelection.on("contextmenu", (event: MouseEvent) => {
            if (!event) {
                return;
            }

            this.selectionManager.showContextMenu({}, {
                x: event.clientX,
                y: event.clientY,
            });

            event.preventDefault();
            event.stopPropagation();
        });
    }

    private select(dataPoints: SelectableDataPoint | SelectableDataPoint[], multiSelect: boolean): void {
        if (!dataPoints) {
            return;
        }

        if (!Array.isArray(dataPoints)) {
            dataPoints = [dataPoints];
        }

        const selectionIdsToSelect: ISelectionId[] = [];
        for (const dataPoint of dataPoints) {
            if (!dataPoint || !dataPoint.identity) {
                continue;
            }

            selectionIdsToSelect.push(dataPoint.identity);
        }

        this.selectionManager.select(selectionIdsToSelect, multiSelect);
        this.syncSelectionState();
        this.renderSelection();
    }

    private clear(): void {
        this.selectionManager.clear();
        this.syncSelectionState();
        this.renderSelection();
    }

    private get hasSelection(): boolean {
        const selectionIds = this.selectionManager.getSelectionIds();
        return selectionIds.length > 0;
    }

    private renderSelection() {
        if (this.hasSelection) {
            this.renderDataPointSelection();
        } else {
            this.renderClearSelection();
        }
    }

    private syncSelectionState(): void {
        const selectedIds: ISelectionId[] = <ISelectionId[]>this.selectionManager.getSelectionIds();
        for (const dataPoint of this.options.dataPoints) { 
            dataPoint.selected = this.isDataPointSelected(dataPoint, selectedIds);
        }
    }

    private isDataPointSelected(dataPoint: SelectableDataPoint, selectedIds: ISelectionId[]): boolean {
        return selectedIds.some((value: ISelectionId) => value.includes(<ISelectionId>dataPoint.identity));
    }

    private renderDataPointSelection(): void {
        const { arcSelection, chordSelection } = this.options;

        chordSelection.style("opacity", this.DimmedOpacity);

        arcSelection.style("opacity", (arcDescriptor: ChordArcDescriptor, arcIndex: number) => {
            const isArcSelected = arcDescriptor.selected;

            chordSelection
                .filter((chordLink: any) => {
                    return (chordLink.source.index === arcIndex && isArcSelected
                        || chordLink.target.index === arcIndex)
                        && isArcSelected;
                })
                .style("opacity", this.FullOpacity)

            return isArcSelected ? this.FullOpacity : this.DimmedOpacity;
        });
    }

    private renderClearSelection(): void {
        const { arcSelection, chordSelection } = this.options;
        arcSelection.style("opacity", this.FullOpacity);
        chordSelection.style("opacity", this.FullOpacity);
    }
}