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

module powerbi.extensibility.visual {
    // d3
    import Selection = d3.Selection;
    import UpdateSelection = d3.selection.Update;

    import ClassAndSelector = jsCommon.CssConstants.ClassAndSelector;
    import createClassAndSelector = jsCommon.CssConstants.createClassAndSelector;
    import PixelConverter = jsCommon.PixelConverter;
    import LegendData = powerbi.visuals.LegendData;
    import IDataLabelInfo = powerbi.IDataLabelInfo;
    import LabelEnabledDataPoint = powerbi.visuals.LabelEnabledDataPoint;
    import SelectableDataPoint = powerbi.visuals.SelectableDataPoint;
    import TooltipDataItem = powerbi.visuals.TooltipDataItem;
    import IMargin = powerbi.visuals.IMargin;
    import IViewport = powerbi.IViewport;
    import DataView = powerbi.DataView;
    import DataViewObjectPropertyIdentifier = powerbi.DataViewObjectPropertyIdentifier;
    import IEnumType = powerbi.IEnumType;
    import createEnumType = powerbi.createEnumType;
    import IEnumMember = powerbi.IEnumMember;
    import DataViewObjects = powerbi.DataViewObjects;
    import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
    import VisualObjectInstance = powerbi.VisualObjectInstance;
    import dataLabelUtils = powerbi.visuals.dataLabelUtils;
    import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
    import DataViewValueColumns = powerbi.DataViewValueColumns;
    import DataViewCategoricalColumn = powerbi.DataViewCategoricalColumn;
    import converterHelper = powerbi.visuals.converterHelper;
    import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
    import DataViewValueColumn = powerbi.DataViewValueColumn;
    import VisualDataRoleKind = powerbi.VisualDataRoleKind;
    import IDataColorPalette = powerbi.extensibility.IColorPalette;

    import ColorHelper = powerbi.visuals.ColorHelper;
    import valueFormatter = powerbi.visuals.valueFormatter;
    import TooltipBuilder = powerbi.visuals.TooltipBuilder;
    import AnimatorCommon = powerbi.visuals.AnimatorCommon;
    import DataLabelManager = powerbi.DataLabelManager;
    import DataLabelArrangeGrid = powerbi.DataLabelArrangeGrid;
    import shapes = powerbi.visuals.shapes;
    import IRect = powerbi.visuals.IRect;
    import SVGUtil = powerbi.visuals.SVGUtil;
    import TooltipManager = powerbi.visuals.TooltipManager;
    import TooltipEvent = powerbi.visuals.TooltipEvent;
    import ILabelLayout = powerbi.visuals.ILabelLayout;
    import lessWithPrecision = powerbi.Double.lessWithPrecision;

    // import GraphLink = D3.Layout.GraphLink;

    import Chord = d3.layout.Chord;

    import ChordLink = d3.layout.chord.Link;
    import ChordNode = d3.layout.chord.Node;
    import ChordGroup = d3.layout.chord.Group;

    import Arc = d3.svg.arc.Arc;
    import SvgArc = d3.svg.Arc;

    import IValueFormatter = powerbi.visuals.IValueFormatter;
    import ISelectionId = powerbi.visuals.ISelectionId;

    export interface ChordChartData {
        settings: ChordChartSettings;
        dataView: DataView;
        dataMatrix: number[][];
        legendData?: LegendData;
        tooltipData: ChordTooltipData[][];
        sliceTooltipData: ChordTooltipData[];
        tickUnit: number;
        differentFromTo: boolean;
        defaultDataPointColor?: string;
        prevAxisVisible: boolean;

        labelDataPoints: ChordArcDescriptor[];
        groups: ChordGroup[];
        chords: ChordLink[];
    }

    export interface ChordTicksArcDescriptor extends ChordGroup {
        angleLabels: { angle: number, label: string }[];
    }

    export interface ChordArcDescriptor extends ChordGroup, IDataLabelInfo {
        data: ChordArcLabelData;
    }

    export interface ChordArcLabelData extends LabelEnabledDataPoint, SelectableDataPoint {
        label: string;
        labelColor: string;
        barColor: string;
        isCategory: boolean;
    }

    export interface ChordLabelEnabledDataPoint extends LabelEnabledDataPoint {
        data?: ChordArcLabelData;
    }

    export interface ChordTooltipData {
        tooltipInfo: TooltipDataItem[];
    }

    export class ChordChart implements IVisual {

        public static PolylineOpacity = 0.5;

        private static OuterArcRadiusRatio = 0.9;
        private static InnerArcRadiusRatio = 0.8;
        private static LabelMargin = 10;
        private static DefaultViewPort: IViewport = { width: 150, height: 150 };
        private static DefaultMargin: IMargin = { left: 10, right: 10, top: 10, bottom: 10 };
        private static VisualClassName = "chordChart";
        private static TicksFontSize = 12;

        private static MaxValue: number = 1000;

        private static InnerLinePointMultiplier: number = 2.05;

        private static ChordLayoutPadding: number = 0.1;

        private static sliceClass: ClassAndSelector = createClassAndSelector("slice");
        private static chordClass: ClassAndSelector = createClassAndSelector("chord");
        private static sliceTicksClass: ClassAndSelector = createClassAndSelector("slice-ticks");
        private static tickPairClass: ClassAndSelector = createClassAndSelector("tick-pair");
        private static tickLineClass: ClassAndSelector = createClassAndSelector("tick-line");
        private static tickTextClass: ClassAndSelector = createClassAndSelector("tick-text");
        private static ticksClass: ClassAndSelector = createClassAndSelector("ticks");
        private static labelGraphicsContextClass: ClassAndSelector = createClassAndSelector("labels");
        private static labelsClass: ClassAndSelector = createClassAndSelector("data-labels");
        private static linesGraphicsContextClass: ClassAndSelector = createClassAndSelector("lines");
        private static lineClass: ClassAndSelector = createClassAndSelector("line-label");
        private static polylineClass: ClassAndSelector = createClassAndSelector("polyline");

        private svg: Selection<any>;
        private mainGraphicsContext: Selection<any>;
        private slices: Selection<any>;
        private labels: Selection<any>;
        private lines: Selection<any>;

        private data: ChordChartData;
        private get settings(): ChordChartSettings {
            return this.data && this.data.settings;
        }
        private layout: VisualLayout;
        private duration: number;
        private colors: IDataColorPalette;

        private selectionManager: ISelectionManager;
        private host: IVisualHost;

        private radius: number;
        private get innerRadius(): number {
            return this.radius * ChordChart.InnerArcRadiusRatio;
        }
        private get outerRadius(): number {
            return this.radius * ChordChart.OuterArcRadiusRatio;
        }

        private static convertCategoricalToArray(values: any[]): number[] {
            return _.map(_.invert(values), (d: any): number => parseFloat(d));
        }

        /* Convert a DataView into a view model */
        public static converter(dataView: DataView, host: IVisualHost, colors: IDataColorPalette, prevAxisVisible: boolean): ChordChartData {
            let settings: ChordChartSettings = ChordChartSettings.parse(dataView, chordChartProperties)
            let columns = ChordChartColumns.getCategoricalColumns(dataView);
            let sources = ChordChartColumns.getColumnSources(dataView);
            let categoricalValues = ChordChartColumns.getCategoricalValues(dataView);

            if (!categoricalValues || _.isEmpty(categoricalValues.Category) || _.isEmpty(categoricalValues.Y)) {
                return null;
            }

            categoricalValues.Series = categoricalValues.Series || ChordChartColumns.getSeriesValues(dataView);

            let dataMatrix: number[][] = [];
            let renderingDataMatrix: number[][] = [];
            let legendData: LegendData = {
                dataPoints: [],
                title: sources.Y.displayName || "",
            };
            let toolTipData: ChordTooltipData[][] = [];
            let sliceTooltipData: ChordTooltipData[] = [];
            let max: number = ChordChart.MaxValue;
            let seriesIndex: number[] = this.convertCategoricalToArray(categoricalValues.Series); /* series index array */
            let catIndex: number[] = this.convertCategoricalToArray(categoricalValues.Category);/* index array for category names */
            let isDiffFromTo: boolean = false;  /* boolean variable indicates that From and To are different */
            let labelData: ChordArcLabelData[] = [];    /* label data: !important */
            let colorHelper = new ColorHelper(colors, chordChartProperties.dataPoint.fill, settings.dataPoint.defaultColor);
            let totalFields: any[] = this.union_arrays(categoricalValues.Category, categoricalValues.Series).reverse();

            if (ChordChart.getValidArrayLength(totalFields) ===
                ChordChart.getValidArrayLength(categoricalValues.Category) + ChordChart.getValidArrayLength(categoricalValues.Series)) {
                isDiffFromTo = true;
            }

            let categoryColumnFormatter: IValueFormatter = valueFormatter.create({
                format: valueFormatter.getFormatString(sources.Category, chordChartProperties.general.formatString, true)
                || sources.Category.format
            });
            let seriesColumnFormatter: IValueFormatter = valueFormatter.create({
                format: sources.Series && (valueFormatter.getFormatString(sources.Series, chordChartProperties.general.formatString, true)
                || sources.Series.format)
            });
            let valueColumnFormatter: IValueFormatter = valueFormatter.create({
                format: valueFormatter.getFormatString(sources.Y, chordChartProperties.general.formatString, true)
                || sources.Y.format
            });

            for (let i: number = 0, iLength: number = totalFields.length; i < iLength; i++) {
                let id: ISelectionId = null;
                let color: string = "";
                let isCategory: boolean = false;
                let index: number;
                let formattedFromToValue = (sources.Series && i < categoricalValues.Series.length)
                    ? seriesColumnFormatter.format(totalFields[i])
                    : categoryColumnFormatter.format(totalFields[i]);

                if ((index = catIndex[totalFields[i]]) !== undefined) {
                    id = host.createSelectionIdBuilder()
                        .withCategory(columns.Category, index)
                        .createSelectionId();
                    isCategory = true;
                    let thisCategoryObjects = columns.Category.objects ? columns.Category.objects[index] : undefined;
                    color = ChordChartHelpers.getColorForSeriesValue(colorHelper, thisCategoryObjects, /* cat.identityFields */ undefined, categoricalValues.Category[index]);

                } else if ((index = seriesIndex[totalFields[i]]) !== undefined) {
                    let seriesData = columns.Y[index];
                    let seriesObjects = seriesData && seriesData.objects && seriesData.objects[0];
                    let seriesNameStr = converterHelper.getSeriesName(seriesData.source);
                    debugger;
                    /*
                    //id = SelectionId.createWithId(seriesData.identity);
                    id = host.createSelectionIdBuilder()
                        .withSeries(columns.Y, index)
                        .createSelectionId();
                    //id = seriesData.identity;*/
                    isCategory = false;

                    color = ChordChartHelpers.getColorForSeriesValue(colorHelper, seriesObjects, /* values.identityFields */ undefined, seriesNameStr);
                }

                labelData.push({
                    label: formattedFromToValue,
                    labelColor: settings.labels.color,
                    barColor: color,
                    isCategory: isCategory,
                    identity: id,
                    selected: false,
                    labelFontSize: PixelConverter.fromPointToPixel(settings.labels.fontSize)
                });

                renderingDataMatrix.push([]);
                dataMatrix.push([]);
                toolTipData.push([]);

                for (let j: number = 0, jLength: number = totalFields.length; j < jLength; j++) {
                    let elementValue: number = 0;
                    let tooltipInfo: TooltipDataItem[] = [];

                    if (catIndex[totalFields[i]] !== undefined &&
                        seriesIndex[totalFields[j]] !== undefined) {
                        let row: number = catIndex[totalFields[i]];
                        let col: number = seriesIndex[totalFields[j]];
                        if (columns.Y[col].values[row] !== null) {
                            elementValue = <number>columns.Y[col].values[row];

                            if (elementValue > max) {
                                max = elementValue;
                            }

                            tooltipInfo = TooltipBuilder.createTooltipInfo(
                                chordChartProperties.general.formatString,
                                dataView.categorical,
                                formattedFromToValue,
                                valueColumnFormatter.format(elementValue),
                                null,
                                null,
                                col,
                                row);
                        }
                    } else if (isDiffFromTo && catIndex[totalFields[j]] !== undefined &&
                        seriesIndex[totalFields[i]] !== undefined) {
                        let row: number = catIndex[totalFields[j]];
                        let col: number = seriesIndex[totalFields[i]];
                        if (columns.Y[col].values[row] !== null) {
                            elementValue = <number>columns.Y[col].values[row];
                        }
                    }

                    renderingDataMatrix[i].push(Math.max(elementValue || 0, 0));
                    dataMatrix[i].push(elementValue || 0);
                    toolTipData[i].push({
                        tooltipInfo: tooltipInfo
                    });
                }

                let totalSum: number = d3.sum(dataMatrix[i]);

                sliceTooltipData.push({
                    tooltipInfo: [{
                        displayName: formattedFromToValue,
                        value: valueColumnFormatter.format(totalSum)
                    }]
                });
            }

            let chordLayout = d3.layout.chord()
                .padding(ChordChart.ChordLayoutPadding)
                .matrix(renderingDataMatrix);

            let labelDataPoints: ChordArcDescriptor[],
                chordLayoutGroups: ChordGroup[] = chordLayout.groups(),
                groups: ChordGroup[] = ChordChart.copyArcDescriptorsWithoutNaNValues(chordLayoutGroups),
                chords: ChordLink[] = chordLayout.chords(),
                unitLength: number = Math.round(max / 5).toString().length - 1;

            labelDataPoints = ChordChart.getChordArcDescriptors(
                ChordChart.copyArcDescriptorsWithoutNaNValues(chordLayoutGroups),
                labelData);

            return {
                dataMatrix: dataMatrix,
                dataView: dataView,
                settings: settings,
                labelDataPoints: labelDataPoints,
                legendData: legendData,
                tooltipData: toolTipData,
                sliceTooltipData: sliceTooltipData,
                tickUnit: Math.pow(10, unitLength),
                differentFromTo: isDiffFromTo,
                prevAxisVisible: prevAxisVisible === undefined
                    ? settings.axis.show
                    : prevAxisVisible,
                groups: groups,
                chords: chords
            };
        }

        /* Check every element of the array and returns the count of elements which are valid(not undefined) */
        private static getValidArrayLength(array: any[]): number {
            let len = 0;
            for (let i: number = 0, iLen = array.length; i < iLen; i++) {
                if (array[i] !== undefined) {
                    len++;
                }
            }
            return len;
        }

        private static getChordArcDescriptors(groups: ChordGroup[], datum: ChordArcLabelData[]): ChordArcDescriptor[] {
            groups.forEach((x: ChordArcDescriptor, index: number) => {
                x.data = datum[index];
            });

            return groups as ChordArcDescriptor[];
        }

       constructor(options: VisualConstructorOptions) {
            this.selectionManager = options.host.createSelectionManager();
            this.host = options.host;

            this.layout = new VisualLayout(ChordChart.DefaultViewPort, ChordChart.DefaultMargin);
            this.layout.minViewport = { width: 150, height: 150 };

            this.svg = d3.select(options.element)
                .append("svg")
                .style("position", "absolute")
                .classed(ChordChart.VisualClassName, true);

            this.mainGraphicsContext = this.svg
                .append("g");

            this.mainGraphicsContext
                .append("g")
                .classed("chords", true);

            this.slices = this.mainGraphicsContext
                .append("g")
                .classed("slices", true);

            this.mainGraphicsContext
                .append("g")
                .classed(ChordChart.ticksClass.class, true);

            this.labels = this.mainGraphicsContext
                .append("g")
                .classed(ChordChart.labelGraphicsContextClass.class, true);

            this.lines = this.mainGraphicsContext
                .append("g")
                .classed(ChordChart.linesGraphicsContextClass.class, true);

            this.colors = options.host.colorPalette;
        }

        /* Called for data, size, formatting changes*/
        public update(options: VisualUpdateOptions) {
            // assert dataView
            if (!options.dataViews || !options.dataViews[0]) {
                return;
            }

            this.layout.viewport = options.viewport;

            this.duration = AnimatorCommon.MinervaAnimationDuration;

            this.data = ChordChart.converter(
                options.dataViews[0],
                this.host,
                this.colors,
                this.settings && this.settings.axis.show);

            if (!this.data) {
                this.clear();

                return;
            }

            this.layout.resetMargin();
            this.layout.margin.top = this.layout.margin.bottom = PixelConverter.fromPointToPixel(this.settings.labels.fontSize) / 2;

            this.render();
        }

        /* Enumerate format values
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions) {
            let instances = ChordChartSettings.enumerateObjectInstances(this.settings, options, ChordChart.capabilities);

            if (this.settings
                && options.objectName === "dataPoint"
                && !_.isEmpty(this.data.labelDataPoints)
                && this.settings.dataPoint.showAllDataPoints) {

                for (let i: number = 0, length = this.data.labelDataPoints.length; i < length; i++) {
                    let labelDataPoint: ChordArcLabelData = this.data.labelDataPoints[i].data;

                    if (labelDataPoint.isCategory) {
                        let colorInstance: VisualObjectInstance = {
                            objectName: "dataPoint",
                            displayName: labelDataPoint.label,
                            selector: ColorHelper.normalizeSelector(labelDataPoint.identity.getSelector()),
                            properties: {
                                fill: { solid: { color: labelDataPoint.barColor } }
                            }
                        };

                        instances.pushInstance(colorInstance);
                    }
                }
            }

            return instances.complete();
        }
        */

        /* Calculate radius */
        private calculateRadius(): number {
            if (this.settings.labels.show) {
                // if we have category or data labels, use a sigmoid to blend the desired denominator from 2 to 3.
                // if we are taller than we are wide, we need to use a larger denominator to leave horizontal room for the labels.
                let hw = this.layout.viewportIn.height / this.layout.viewportIn.width;
                let denom = 2 + (1 / (1 + Math.exp(-5 * (hw - 1))));
                return Math.min(this.layout.viewportIn.height, this.layout.viewportIn.width) / denom;
            }

            // no labels
            return Math.min(this.layout.viewportIn.height, this.layout.viewportIn.width) / 2;
        }

        private drawCategoryLabels(): void {
            /** Multiplier to place the end point of the reference line at 0.05 * radius away from the outer edge of the chord/pie. */

            let arc: SvgArc<Arc> = d3.svg.arc()
                .innerRadius(0)
                .outerRadius(this.innerRadius);

            let outerArc: SvgArc<Arc> = d3.svg.arc()
                .innerRadius(this.outerRadius)
                .outerRadius(this.outerRadius);

            if (this.settings.labels.show) {
                let labelLayout = this.getChordChartLabelLayout(outerArc);
                let filteredData = this.getDataLabelManager().hideCollidedLabels(
                    this.layout.viewportIn,
                    this.data.labelDataPoints,
                    labelLayout,
                    /* addTransform */ true);

                this.renderLabels(filteredData, labelLayout, true);
                this.renderLines(filteredData, arc, outerArc);
            }
            else {
                dataLabelUtils.cleanDataLabels(this.labels);
                dataLabelUtils.cleanDataLabels(this.lines, true);
            }
        }

        private getDataLabelManager(): DataLabelManager {
            let dataLabelManager = new DataLabelManager();
            (<any>dataLabelManager).hasCollisions = hasCollisions.bind(dataLabelManager);
            return dataLabelManager;

            function hasCollisions(arrangeGrid: DataLabelArrangeGrid, info: IDataLabelInfo, position: IRect, size: shapes.ISize) {
                if (arrangeGrid.hasConflict(position)) {
                    return true;
                }

                let intersection = { left: 0, top: position.height / 2, width: size.width, height: size.height };
                intersection = shapes.Rect.inflate(intersection, {
                    left: DataLabelManager.InflateAmount,
                    top: 0,
                    right: DataLabelManager.InflateAmount,
                    bottom: 0
                });
                intersection = shapes.Rect.intersect(intersection, position);

                if (shapes.Rect.isEmpty(intersection)) {
                    return true;
                }

                return lessWithPrecision(intersection.height, position.height / 2);
            }
        }

        private render(): void {
            this.radius = this.calculateRadius();

            let arc: SvgArc<Arc> = d3.svg.arc()
                .innerRadius(this.radius)
                .outerRadius(this.innerRadius);

            this.svg
                .attr({
                    "width": this.layout.viewport.width,
                    "height": this.layout.viewport.height
                });

            this.mainGraphicsContext
                .attr("transform", SVGUtil.translate(this.layout.viewport.width / 2, this.layout.viewport.height / 2));

            let sliceShapes = this.slices
                .selectAll("path" + ChordChart.sliceClass.selector)
                .data(this.getChordTicksArcDescriptors());

            sliceShapes.enter()
                .insert("path")
                .classed(ChordChart.sliceClass.class, true);

            sliceShapes.style("fill", (d, i) => this.data.labelDataPoints[i].data.barColor)
                .style("stroke", (d, i) => this.data.labelDataPoints[i].data.barColor)
                .on("click", ChordChartHelpers.addContext(this, (context, d, i) => {
                    this.selectionManager.select(this.data.labelDataPoints[i].data.identity).then(ids => {
                        if (ids.length > 0) {
                            this.mainGraphicsContext
                                .selectAll(".chords path.chord")
                                .style("opacity", 1);

                            this.slices
                                .selectAll("path.slice")
                                .style("opacity", 0.3);

                            this.mainGraphicsContext
                                .selectAll(".chords path.chord")
                                .filter(d => d.source.index !== i && d.target.index !== i)
                                .style("opacity", 0.3);

                            d3.select(context).style("opacity", 1);
                        } else {
                            sliceShapes.style("opacity", 1);

                            this.mainGraphicsContext
                                .selectAll(".chords path.chord")
                                .filter(d => d.source.index !== i && d.target.index !== i)
                                .style("opacity", 1);
                        }
                    });

                    (d3.event as MouseEvent).stopPropagation();
                }))
                .transition()
                .duration(this.duration)
                .attrTween("d", ChordChartHelpers.interpolateArc(arc));

            sliceShapes
                .exit()
                .remove();

            TooltipManager.addTooltip(sliceShapes, (tooltipEvent: TooltipEvent) => {
                return this.data.sliceTooltipData[tooltipEvent.data.index].tooltipInfo;
            });

            let path = d3.svg.chord()
                .radius(this.radius);

            let chordShapes = this.svg.select(".chords")
                .selectAll("path" + ChordChart.chordClass.selector)
                .data(this.data.chords);

            chordShapes
                .enter()
                .insert("path")
                .classed(ChordChart.chordClass.class, true);

            chordShapes
                .style({
                    "fill": (d: ChordLink) => {
                        return this.data.labelDataPoints[d.target.index].data.barColor;
                    },
                    "opacity": 1
                })
                .transition()
                .duration(this.duration)
                .attr("d", path as any);

            chordShapes
                .exit()
                .remove();

            this.svg
                .on("click", () => this.selectionManager.clear().then(() => {
                    sliceShapes.style("opacity", 1);
                    chordShapes.style("opacity", 1);
                }));

            this.drawTicks();
            this.drawCategoryLabels();

            TooltipManager.addTooltip(chordShapes, (tooltipEvent: TooltipEvent) => {
                let tooltipInfo: TooltipDataItem[] = [];

                if (this.data.differentFromTo) {
                    tooltipInfo = this.data.tooltipData[tooltipEvent.data.source.index]
                    [tooltipEvent.data.source.subindex]
                        .tooltipInfo;
                } else {
                    tooltipInfo.push({
                        displayName: this.data.labelDataPoints[tooltipEvent.data.source.index].data.label
                        + "->" + this.data.labelDataPoints[tooltipEvent.data.source.subindex].data.label,
                        value: this.data.dataMatrix[tooltipEvent.data.source.index]
                        [tooltipEvent.data.source.subindex].toString()
                    });
                    tooltipInfo.push({
                        displayName: this.data.labelDataPoints[tooltipEvent.data.target.index].data.label
                        + "->" + this.data.labelDataPoints[tooltipEvent.data.target.subindex].data.label,
                        value: this.data.dataMatrix[tooltipEvent.data.target.index]
                        [tooltipEvent.data.target.subindex].toString()
                    });
                }

                return tooltipInfo;
            });
        }

        private clear(): void {
            this.clearNodes([
                ChordChart.chordClass,
                ChordChart.sliceClass,
                ChordChart.sliceTicksClass,
                ChordChart.labelsClass,
                ChordChart.lineClass
            ]);
        }

        private clearTicks(): void {
           this.clearNodes([
                ChordChart.tickLineClass,
                ChordChart.tickPairClass,
                ChordChart.tickTextClass,
                ChordChart.sliceTicksClass
           ]);
        }

        private clearNodes(selectors: ClassAndSelector | ClassAndSelector[]): void {
            selectors = $.isArray(selectors) ? selectors : [selectors] as ClassAndSelector[];
            _.forEach(selectors, (d: ClassAndSelector) => ChordChart.clearNode(this.mainGraphicsContext, d));
        }

        private static clearNode(selector: Selection<any>, d: ClassAndSelector): void {
            const empty: any[] = [];
            let selectors: UpdateSelection<any> = selector
                .selectAll(d.selector)
                .data(empty);

            selectors
                .exit()
                .remove();
        }

        private getChordTicksArcDescriptors(): ChordTicksArcDescriptor[] {
            let groups: ChordGroup[] = this.data.groups;

            let maxValue: number = !_.isEmpty(groups) && _.max(_.map(groups, (x: ChordGroup) => x.value)) || 0;
            let minValue: number = !_.isEmpty(groups) && _.max(_.map(groups, (x: ChordGroup) => x.value)) || 0;

            let radiusCoeff: number = this.radius / Math.abs(maxValue - minValue) * 1.25;

            let formatter: IValueFormatter = valueFormatter.create({
                format: "0.##",
                value: maxValue
            });

            groups.forEach((x: ChordTicksArcDescriptor) => {
                let k = (x.endAngle - x.startAngle) / x.value,
                    absValue = Math.abs(x.value),
                    range = d3.range(0, absValue, absValue - 1 < 0.15 ? 0.15 : absValue - 1);

                if (x.value < 0) {
                    range = range.map(x => x * -1).reverse();
                }

                for (let i = 1; i < range.length; i++) {
                    let gapSize = Math.abs(range[i] - range[i - 1]) * radiusCoeff;

                    if (gapSize < ChordChart.TicksFontSize) {
                        if (range.length > 2 && i === range.length - 1) {
                            range.splice(--i, 1);
                        } else {
                            range.splice(i--, 1);
                        }
                    }
                }

                x.angleLabels = range.map((v, i) => <any>{ angle: v * k + x.startAngle, label: formatter.format(v) });
            });

            return <ChordTicksArcDescriptor[]>groups;
        }

        public static copyArcDescriptorsWithoutNaNValues(arcDescriptors: ChordGroup[]): ChordGroup[] {
            if (_.isEmpty(arcDescriptors)) {
                return arcDescriptors;
            }

            return arcDescriptors.map((sourceArcDescriptor: ChordGroup) => {
                let targetArcDescriptor: ChordGroup = <ChordGroup>{};

                for (let propertyName in sourceArcDescriptor) {
                    if (!sourceArcDescriptor[propertyName] && isNaN(sourceArcDescriptor[propertyName])) {
                        targetArcDescriptor[propertyName] = 0;
                    } else {
                        targetArcDescriptor[propertyName] = sourceArcDescriptor[propertyName];
                    }
                }

                return targetArcDescriptor;
            });
        }

        /* Draw axis(ticks) around the arc */
        private drawTicks(): void {
            if (this.settings.axis.show) {
                let tickShapes = this.mainGraphicsContext
                    .select(".ticks")
                    .selectAll("g" + ChordChart.sliceTicksClass.selector)
                    .data(this.data.groups);

                let animDuration: number = (this.data.prevAxisVisible === this.settings.axis.show)
                    ? this.duration
                    : 0;

                tickShapes
                    .enter()
                    .insert("g")
                    .classed(ChordChart.sliceTicksClass.class, true);

                let tickPairs = tickShapes
                    .selectAll("g" + ChordChart.tickPairClass.selector)
                    .data((d: ChordTicksArcDescriptor) => d.angleLabels);

                tickPairs
                    .enter()
                    .insert("g")
                    .classed(ChordChart.tickPairClass.class, true);

                tickPairs.transition()
                    .duration(animDuration)
                    .attr("transform", (d) =>
                        SVGUtil.translateAndRotate(this.innerRadius, 0, 0, 0, d.angle * 180 / Math.PI - 90));
                       // "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" + "translate(" + this.innerRadius + ",0)");

                tickPairs
                    .selectAll("line" + ChordChart.tickLineClass.selector)
                    .data((d) => [d])
                    .enter()
                    .insert("line")
                    .classed(ChordChart.tickLineClass.class, true)
                    .style("stroke", "#000")
                    .attr("x1", 1)
                    .attr("y1", 0)
                    .attr("x2", 5)
                    .attr("y2", 0);

                tickPairs
                    .selectAll("text" + ChordChart.tickTextClass.selector)
                    .data((d) => [d])
                    .enter()
                    .insert("text")
                    .classed(ChordChart.tickTextClass.class, true)
                    .style("pointer-events", "none")
                    .attr("x", 8)
                    .attr("dy", ".35em");

                tickPairs
                    .selectAll("text" + ChordChart.tickTextClass.selector)
                    .text(d => d.label)
                    .style("text-anchor", d => d.angle > Math.PI ? "end" : null)
                    .attr("transform", d => d.angle > Math.PI ? "rotate(180)translate(-16)" : null);

                tickPairs.exit()
                    .remove();

                tickShapes.exit()
                    .remove();

            } else {
                this.clearTicks();
            }
        }

        private renderLabels(
            filteredData: ChordLabelEnabledDataPoint[],
            layout: ILabelLayout,
            isDonut: boolean = false,
            forAnimation: boolean = false): void {

            // Check for a case where resizing leaves no labels - then we need to remove the labels "g"
            if (filteredData.length === 0) {
                dataLabelUtils.cleanDataLabels(this.labels, true);

                return null;
            }

            // line chart ViewModel has a special "key" property for point identification since the "identity" field is set to the series identity
            let hasKey: boolean = (<any>filteredData)[0].key !== null;
            let hasDataPointIdentity: boolean = (<any>filteredData)[0].identity !== null;

            let getIdentifier = hasKey
                ? (d: any) => d.key
                : hasDataPointIdentity
                    ? (d: SelectableDataPoint) => (d.identity as ISelectionId).getKey()
                    : undefined;

            let dataLabels = isDonut
                ? this.labels.selectAll(ChordChart.labelsClass.selector)
                    .data(filteredData, (d: ChordLabelEnabledDataPoint) => (d.data.identity as ISelectionId).getKey())
                : getIdentifier !== null
                    ? this.labels.selectAll(ChordChart.labelsClass.selector).data(filteredData, getIdentifier)
                    : this.labels.selectAll(ChordChart.labelsClass.selector).data(filteredData);

            let newLabels = dataLabels.enter()
                .append("text")
                .classed(ChordChart.labelsClass.class, true);

            if (forAnimation) {
                newLabels.style("opacity", 0);
            }

            dataLabels
                .attr({
                    x: (d: LabelEnabledDataPoint) => d.labelX,
                    y: (d: LabelEnabledDataPoint) => d.labelY,
                    dy: ".35em"
                })
                .text((d: LabelEnabledDataPoint) => d.labeltext)
                .style(layout.style);

            dataLabels
                .exit()
                .remove();
        }

        private renderLines(filteredData: ChordLabelEnabledDataPoint[], arc: SvgArc<Arc>, outerArc: SvgArc<Arc>): void {
            let lines = this.lines
                .selectAll("polyline")
                .data(filteredData as any, (d: ChordArcDescriptor) => (d.data.identity as ISelectionId).getKey());

            let midAngle = (d: ChordArcDescriptor) => d.startAngle + (d.endAngle - d.startAngle) / 2;

            lines.enter()
                .append("polyline")
                .classed(ChordChart.lineClass.class, true);

            lines
               /*.attr("points", (d: ChordArcDescriptor) => {
                    let textPoint = outerArc.centroid(d as any);

                    textPoint[0] = (this.radius + ChordChart.LabelMargin / 2) * (midAngle(d) < Math.PI ? 1 : -1);

                    let midPoint = outerArc.centroid(d as any);
                    let chartPoint = arc.centroid(d as any);

                    chartPoint[0] *= ChordChart.InnerLinePointMultiplier;
                    chartPoint[1] *= ChordChart.InnerLinePointMultiplier;

                    return [
                        chartPoint,
                        midPoint,
                        textPoint
                    ];
                })*/
                .style({
                    "opacity": ChordChart.PolylineOpacity,
                    "stroke": (d: ChordArcDescriptor) => {
                        debugger;
                        return d.data.labelColor;
                    },
                    "pointer-events": "none"
                });

            lines
                .exit()
                .remove();
        }

        /* Get label layout */
        private getChordChartLabelLayout(outerArc: SvgArc<Arc>): ILabelLayout {
            let midAngle = (d: ChordArcDescriptor) => d.startAngle + (d.endAngle - d.startAngle) / 2;
            let maxLabelWidth: number = (this.layout.viewportIn.width - this.radius * 2 - ChordChart.LabelMargin * 2) / 1.6;

            return {
                labelText: (d: ChordLabelEnabledDataPoint) => {
                    // show only category label
                    return dataLabelUtils.getLabelFormattedText({
                        label: d.data.label,
                        maxWidth: maxLabelWidth,
                        fontSize: PixelConverter.fromPointToPixel(this.settings.labels.fontSize),
                    });
                },
                labelLayout: {
                    x: (d: ChordArcDescriptor) =>
                        (this.radius + ChordChart.LabelMargin) * (midAngle(d) < Math.PI ? 1 : -1),
                    y: (d: ChordArcDescriptor) => {
                        let pos = outerArc.centroid(d as any);
                        return pos[1];
                    },
                },
                filter: (d: ChordArcDescriptor) => (d !== null && d.data !== null && d.data.label !== null),
                style: {
                    "fill": (d: ChordArcDescriptor) => d.data.labelColor,
                    "text-anchor": (d: ChordArcDescriptor) => midAngle(d) < Math.PI ? "start" : "end",
                    "font-size": (d: ChordArcDescriptor) => PixelConverter.fromPoint(this.settings.labels.fontSize),
                },
            };
        }

        /* Utility function for union two arrays without duplicates */
        private static union_arrays(x: any[], y: any[]): any[] {
            let obj: Object = {};

            for (let i: number = 0; i < x.length; i++) {
                obj[x[i]] = x[i];
            }

            for (let i: number = 0; i < y.length; i++) {
                obj[y[i]] = y[i];
            }

            let res: string[] = [];

            for (let k in obj) {
                if (obj.hasOwnProperty(k)) {  // <-- optional
                    res.push(obj[k]);
                }
            }
            return res;
        }
    }
}
