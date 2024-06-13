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

// powerbi
import powerbiVisualsApi from "powerbi-visuals-api";
import ISelectionManager = powerbiVisualsApi.extensibility.ISelectionManager;

// powerbi.extensibility
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;

// powerbi.extensibility.utils.test
import { VisualBuilderBase } from "powerbi-visuals-utils-testutils";

import { ChordChart } from "../src/chordChart";

export class ChordChartBuilder extends VisualBuilderBase<ChordChart> {
    public selectionManager: ISelectionManager;;

    constructor(width: number, height: number) {
        super(width, height, "ChordChart1444757060245");
    }

    protected build(options: VisualConstructorOptions): ChordChart {
        this.selectionManager = this.visualHost.createSelectionManager();

        return new ChordChart(options);
    }

    public get instance(): ChordChart {
        return this.visual;
    }

    public get mainElement(): SVGElement {
        return this.element.querySelector("g")!;
    }

    public get svg(): SVGElement {
        return this.element.querySelector<SVGElement>("svg.chordChart")!;
    }

    public get dataLabels(): NodeListOf<SVGElement> {
        return this.mainElement
            .querySelectorAll("text.data-labels");
    }

    public get sliceTicks(): NodeListOf<SVGElement> {
        return this.mainElement
            .querySelectorAll("g.slice-ticks");
    }

    public get chords(): NodeListOf<SVGElement> {
        return this.mainElement
            .querySelectorAll("path.chord");
    }

    public get slices(): NodeListOf<SVGElement> {
        return this.mainElement
            .querySelectorAll("path.slice");
    }
}
