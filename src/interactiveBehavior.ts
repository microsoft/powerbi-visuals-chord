/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

// d3
import { Selection } from 'd3-selection';

// powerbi.extensibility.utils.interactivity
import { interactivityBaseService } from "powerbi-visuals-utils-interactivityutils";
import IInteractiveBehavior = interactivityBaseService.IInteractiveBehavior;
import ISelectionHandler = interactivityBaseService.ISelectionHandler;
import { ChordArcDescriptor } from "./interfaces";
import { BaseDataPoint } from "powerbi-visuals-utils-interactivityutils/lib/interactivityBaseService";

export interface BehaviorOptions extends interactivityBaseService.IBehaviorOptions<ChordArcDescriptor> {
    clearCatcher: Selection<any, any, any, any>;
    arcSelection: Selection<any, any, any, any>;
    chordSelection: Selection<any, any, any, any>;
}

export class InteractiveBehavior implements IInteractiveBehavior {
    public fullOpacity: number = 1;
    private dimmedOpacity: number = 0.3;

    private behaviorOptions: BehaviorOptions;

    public bindEvents(options: BehaviorOptions, selectionHandler: ISelectionHandler): void {
        this.behaviorOptions = options;

        this.behaviorOptions.clearCatcher.on("click", selectionHandler.handleClearSelection.bind(selectionHandler));

        this.behaviorOptions.arcSelection.on("click", (event: MouseEvent, dataPoint: ChordArcDescriptor) => {
            if (!event) {
                return;
            }

            event.stopPropagation();
            selectionHandler.handleSelection(dataPoint, event.ctrlKey || event.metaKey);
        });
        this.bindContextMenu(options, selectionHandler);
        this.bindContextMenuToClearCatcher(options, selectionHandler);
    }

    protected bindContextMenu(options: BehaviorOptions, selectionHandler: ISelectionHandler) {
        options.arcSelection.on("contextmenu",
            (event: MouseEvent, datum: ChordArcDescriptor ) => {
                selectionHandler.handleContextMenu(datum, {
                    x: event.clientX,
                    y: event.clientY
                });
                event.preventDefault();
                event.stopPropagation();
            });
    }

    protected bindContextMenuToClearCatcher(options: BehaviorOptions, selectionHandler: ISelectionHandler) {
        const {
            clearCatcher
        } = options;

        const emptySelection = {
            "measures": [],
            "dataMap": {
            }
        };

        clearCatcher.on("contextmenu", (event: MouseEvent) => {
            if (!event) {
                return;
            }

            selectionHandler.handleContextMenu(
                <BaseDataPoint>{
                    identity: emptySelection,
                    selected: false
                },
                {
                    x: event.clientX,
                    y: event.clientY
                });
            event.preventDefault();
            event.stopPropagation();
        });
    }


    public renderSelection(hasSelection: boolean): void {
        if (!this.behaviorOptions) {
            return;
        }

        if (hasSelection) {
            this.renderDataPointSelection();
        } else {
            this.renderClearSelection();
        }
    }

    private renderDataPointSelection(): void {
        const { arcSelection, chordSelection } = this.behaviorOptions;

        chordSelection.style("opacity", this.dimmedOpacity);

        arcSelection.style("opacity", (arcDescriptor: ChordArcDescriptor, arcIndex: number) => {
            const isArcSelected: boolean = arcDescriptor.selected;

            chordSelection
                .filter((chordLink: any) => {
                    return (chordLink.source.index === arcIndex && isArcSelected
                        || chordLink.target.index === arcIndex)
                        && isArcSelected;
                })
                .style("opacity", this.fullOpacity);

            return this.getOpacity(arcDescriptor.selected);
        });
    }

    private renderClearSelection(): void {
        const { arcSelection, chordSelection } = this.behaviorOptions;

        arcSelection.style("opacity", this.fullOpacity);
        chordSelection.style("opacity", this.fullOpacity);
    }

    private getOpacity(isSelected: boolean): number {
        return isSelected
            ? this.fullOpacity
            : this.dimmedOpacity;
    }
}
