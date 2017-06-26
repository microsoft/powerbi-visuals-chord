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
    import SvgArc = d3.svg.Arc;
    import Arc = d3.svg.arc.Arc;
    import Chord = d3.layout.Chord;
    import Selection = d3.Selection;
    import ChordLink = d3.layout.chord.Link;
    import ChordNode = d3.layout.chord.Node;
    import ChordGroup = d3.layout.chord.Group;
    import UpdateSelection = d3.selection.Update;

    // powerbi
    import DataView = powerbi.DataView;
    import IViewport = powerbi.IViewport;
    import IEnumType = powerbi.IEnumType;
    import IEnumMember = powerbi.IEnumMember;
    import DataViewObjects = powerbi.DataViewObjects;
    import VisualDataRoleKind = powerbi.VisualDataRoleKind;
    import DataViewValueColumn = powerbi.DataViewValueColumn;
    import VisualObjectInstance = powerbi.VisualObjectInstance;
    import DataViewValueColumns = powerbi.DataViewValueColumns;
    import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
    import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
    import DataViewCategoricalColumn = powerbi.DataViewCategoricalColumn;
    import DataViewObjectPropertyIdentifier = powerbi.DataViewObjectPropertyIdentifier;
    import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;

    // powerbi.extensibility
    import IColorPalette = powerbi.extensibility.IColorPalette;

    // powerbi.visuals
    import ISelectionId = powerbi.visuals.ISelectionId;

    // powerbi.extensibility.utils.dataview
    import converterHelper = powerbi.extensibility.utils.dataview.converterHelper;

    // powerbi.extensibility.utils.svg
    import IRect = powerbi.extensibility.utils.svg.IRect;
    import shapes = powerbi.extensibility.utils.svg.shapes;
    import IMargin = powerbi.extensibility.utils.svg.IMargin;
    import translate = powerbi.extensibility.utils.svg.translate;
    import translateAndRotate = powerbi.extensibility.utils.svg.translateAndRotate;
    import ClassAndSelector = powerbi.extensibility.utils.svg.CssConstants.ClassAndSelector;
    import createClassAndSelector = powerbi.extensibility.utils.svg.CssConstants.createClassAndSelector;

    // powerbi.extensibility.utils.color
    import ColorHelper = powerbi.extensibility.utils.color.ColorHelper;

    // powerbi.extensibility.utils.chart
    import dataLabelUtils = powerbi.extensibility.utils.chart.dataLabel.utils;
    import ILabelLayout = powerbi.extensibility.utils.chart.dataLabel.ILabelLayout;
    import IDataLabelInfo = powerbi.extensibility.utils.chart.dataLabel.IDataLabelInfo;
    import DataLabelManager = powerbi.extensibility.utils.chart.dataLabel.DataLabelManager;
    import DataLabelArrangeGrid = powerbi.extensibility.utils.chart.dataLabel.DataLabelArrangeGrid;
    import LabelEnabledDataPoint = powerbi.extensibility.utils.chart.dataLabel.LabelEnabledDataPoint;
    import LegendData = powerbi.extensibility.utils.chart.legend.LegendData;

    // powerbi.extensibility.utils.formatting
    import valueFormatter = powerbi.extensibility.utils.formatting.valueFormatter;
    import IValueFormatter = powerbi.extensibility.utils.formatting.IValueFormatter;

    // powerbi.extensibility.utils.type
    import PixelConverter = powerbi.extensibility.utils.type.PixelConverter;
    import lessWithPrecision = powerbi.extensibility.utils.type.Double.lessWithPrecision;

    // powerbi.extensibility.utils.interactivity
    import SelectableDataPoint = powerbi.extensibility.utils.interactivity.SelectableDataPoint;

    // powerbi.extensibility.utils.tooltip
    import TooltipEventArgs = powerbi.extensibility.utils.tooltip.TooltipEventArgs;
    import ITooltipServiceWrapper = powerbi.extensibility.utils.tooltip.ITooltipServiceWrapper;
    import createTooltipServiceWrapper = powerbi.extensibility.utils.tooltip.createTooltipServiceWrapper;

    export interface ChordChartData {
        settings: IChordChartSettings;
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

    export type ChordChartCategoricalDict = {};

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
        isGrouped: boolean;
    }

    export interface ChordLabelEnabledDataPoint extends LabelEnabledDataPoint {
        data?: ChordArcLabelData;
    }

    export interface ChordTooltipData {
        tooltipInfo: VisualTooltipDataItem[];
    }

    export class ChordChart implements IVisual {
        private static ChordLayoutPadding: number = 0.1;
        private static DefaultMargin: IMargin = { left: 10, right: 10, top: 10, bottom: 10 };
        private static DefaultViewPort: IViewport = { width: 150, height: 150 };
        private static InnerArcRadiusRatio = 0.8;
        private static InnerLinePointMultiplier: number = 2.05;
        private static LabelMargin = 10;
        private static MaxValue: number = 1000;
        private static OuterArcRadiusRatio = 0.9;
        private static PolylineOpacity = 0.5;
        private static TicksFontSize = 12;
        private static VisualClassName = 'chordChart';
        private static FullOpacity: number = 1;
        private static DimmedOpacity: number = 0.3;
        private static DefaultDY: string = '.35em';
        private static DefaultTickShiftX: number = 8;
        private static MaxUnitSize: number = 5;
        private static DefaultFormatValue: string = '0.##';
        private static DefaultTickLineColorValue: string = '#000';

        private static chordClass: ClassAndSelector = createClassAndSelector('chord');
        private static chordsClass: ClassAndSelector = createClassAndSelector('chords');
        private static labelGraphicsContextClass: ClassAndSelector = createClassAndSelector('labels');
        private static labelsClass: ClassAndSelector = createClassAndSelector('data-labels');
        private static lineClass: ClassAndSelector = createClassAndSelector('line-label');
        private static linesGraphicsContextClass: ClassAndSelector = createClassAndSelector('lines');
        private static polylineClass: ClassAndSelector = createClassAndSelector('polyline');
        private static sliceClass: ClassAndSelector = createClassAndSelector('slice');
        private static sliceTicksClass: ClassAndSelector = createClassAndSelector('slice-ticks');
        private static tickLineClass: ClassAndSelector = createClassAndSelector('tick-line');
        private static tickPairClass: ClassAndSelector = createClassAndSelector('tick-pair');
        private static tickTextClass: ClassAndSelector = createClassAndSelector('tick-text');
        private static ticksClass: ClassAndSelector = createClassAndSelector('ticks');

        private labels: Selection<any>;
        private lines: Selection<any>;
        private mainGraphicsContext: Selection<any>;
        private slices: Selection<any>;
        private svg: Selection<any>;

        private colors: IColorPalette;
        private data: ChordChartData;
        private layout: VisualLayout;

        private duration: number = 250;

        private tooltipServiceWrapper: ITooltipServiceWrapper;

        private selectionManager: ISelectionManager;
        private host: IVisualHost;

        private get settings(): IChordChartSettings {
            return this.data && this.data.settings;
        }

        private radius: number;
        private get innerRadius(): number {
            return this.radius * ChordChart.InnerArcRadiusRatio;
        }
        private get outerRadius(): number {
            return this.radius * ChordChart.OuterArcRadiusRatio;
        }

        private static convertCategoricalToArray(values: any[]): ChordChartCategoricalDict {
            return _.mapValues(_.invert(values), (d: string) => parseFloat(d));
        }

        /* Convert a DataView into a view model */
        public static defaultValue1: number = 1;
        public static converter(dataView: DataView, host: IVisualHost, colors: IColorPalette, prevAxisVisible: boolean): ChordChartData {
            let settings: IChordChartSettings = ChordChartSettings.parse(dataView.metadata.objects, colors);
            let columns: ChordChartColumns<ChordChartCategoricalColumns> = ChordChartColumns.getCategoricalColumns(dataView);
            let sources: ChordChartColumns<DataViewMetadataColumn> = ChordChartColumns.getColumnSources(dataView);
            let categoricalValues: ChordChartColumns<any> = ChordChartColumns.getCategoricalValues(dataView);
            if (!categoricalValues || _.isEmpty(categoricalValues.Category)) {
                return null;
            }

            if (!categoricalValues.Y) {
                categoricalValues.Y = [];
                for (let i: number = 0; i < categoricalValues.Category.length; i++) {
                    categoricalValues.Series.push(sources.Series.displayName + i);
                    categoricalValues.Y.push(ChordChart.defaultValue1);
                }
            }

            categoricalValues.Series = categoricalValues.Series || ChordChartColumns.getSeriesValues(dataView);
            let grouped: DataViewValueColumnGroup[] = null;
            if (columns.Series) {
                grouped = columns.Series.grouped();
            }

            let dataMatrix: number[][] = [];
            let renderingDataMatrix: number[][] = [];
            let legendData: LegendData = {
                dataPoints: [],
                title: sources.Y ? (sources.Y.displayName || '') : 'Value',
            };
            let toolTipData: ChordTooltipData[][] = [];
            let sliceTooltipData: ChordTooltipData[] = [];
            let max: number = ChordChart.MaxValue;
            let seriesIndex: ChordChartCategoricalDict = this.convertCategoricalToArray(categoricalValues.Series); /* series index array */
            let catIndex: ChordChartCategoricalDict = this.convertCategoricalToArray(categoricalValues.Category); /* index array for category names */
            let isDiffFromTo: boolean = false;  /* boolean variable indicates that From and To are different */
            let labelData: ChordArcLabelData[] = [];    /* label data: !important */

            let colorHelper: ColorHelper = new ColorHelper(colors, chordChartProperties.dataPoint.fill, settings.dataPoint.defaultColor);
            let totalFields: any[] = this.union_arrays(categoricalValues.Category, categoricalValues.Series).reverse();

            if (ChordChart.getValidArrayLength(totalFields) ===
                ChordChart.getValidArrayLength(categoricalValues.Category) + ChordChart.getValidArrayLength(categoricalValues.Series)) {
                isDiffFromTo = true;
            }

            let categoryColumnFormatter: IValueFormatter = valueFormatter.create({
                format: valueFormatter.getFormatStringByColumn(sources.Category, true)
                || sources.Category.format
            });
            let seriesColumnFormatter: IValueFormatter = valueFormatter.create({
                format: sources.Series && (valueFormatter.getFormatStringByColumn(sources.Series, true)
                    || sources.Series.format)
            });
            let valueColumnFormatter: IValueFormatter = valueFormatter.create({
                format: sources.Y ? valueFormatter.getFormatStringByColumn(sources.Y, true)
                    || sources.Y.format : "0"
            });

            for (let i: number = 0, iLength: number = totalFields.length; i < iLength; i++) {
                let id: ISelectionId = null;
                let color: string = '';
                let isCategory: boolean = false;
                let index: number;
                let formattedFromToValue: string = (sources.Series && i < categoricalValues.Series.length)
                    ? seriesColumnFormatter.format(totalFields[i])
                    : categoryColumnFormatter.format(totalFields[i]);

                if ((index = catIndex[totalFields[i]]) !== undefined) {
                    id = host.createSelectionIdBuilder()
                        .withCategory(columns.Category, index)
                        .createSelectionId();
                    isCategory = true;
                    let thisCategoryObjects: DataViewObjects = columns.Category.objects ? columns.Category.objects[index] : undefined;

                    color = colorHelper.getColorForSeriesValue(thisCategoryObjects, categoricalValues.Category[index]);
                } else if ((index = seriesIndex[totalFields[i]]) !== undefined) {
                    let seriesObjects: DataViewObjects = (grouped) ? grouped[index].objects : null;

                    let seriesData: DataViewValueColumn = columns.Y ? columns.Y[index] : {
                        objects: null,
                        source: {
                            displayName: "Value",
                            queryName: "Value",
                            groupName: "Value",
                        },
                        values: [ChordChart.defaultValue1]
                    };

                    let seriesNameStr: PrimitiveValue = seriesData ? converterHelper.getSeriesName(seriesData.source) : "Value";

                    id = host.createSelectionIdBuilder()
                        .withSeries(columns.Series, (grouped) ? grouped[index] : null)
                        .withMeasure(seriesNameStr ? seriesNameStr.toString() : null)
                        .createSelectionId();
                    isCategory = false;

                    color = colorHelper.getColorForSeriesValue(seriesObjects, seriesNameStr ? seriesNameStr : `${ChordChart.defaultValue1 }`);
                }

                labelData.push({
                    label: formattedFromToValue,
                    labelColor: settings.labels.color,
                    barColor: color,
                    isCategory: isCategory,
                    isGrouped: !!grouped,
                    identity: id,
                    selected: false,
                    labelFontSize: PixelConverter.fromPointToPixel(settings.labels.fontSize)
                });

                renderingDataMatrix.push([]);
                dataMatrix.push([]);
                toolTipData.push([]);

                for (let j: number = 0, jLength: number = totalFields.length; j < jLength; j++) {
                    let elementValue: number = 0;
                    let tooltipInfo: VisualTooltipDataItem[] = [];

                    if (catIndex[totalFields[i]] !== undefined &&
                        seriesIndex[totalFields[j]] !== undefined) {
                        let row: number = catIndex[totalFields[i]];
                        let col: number = seriesIndex[totalFields[j]];

                        if (columns.Y && columns.Y[col].values[row] !== null) {
                            elementValue = <number>columns.Y[col].values[row];

                            if (elementValue > max) {
                                max = elementValue;
                            }

                            tooltipInfo = tooltipBuilder.createTooltipInfo(
                                dataView.categorical,
                                formattedFromToValue,
                                valueColumnFormatter.format(elementValue),
                                col,
                                row);
                        }
                        else {
                            max = ChordChart.defaultValue1;
                            elementValue = ChordChart.defaultValue1;
                            tooltipInfo = tooltipBuilder.createTooltipInfo(
                                dataView.categorical,
                                formattedFromToValue,
                                valueColumnFormatter.format(`${ChordChart.defaultValue1}`),
                                col,
                                row);
                        }

                    } else if (isDiffFromTo && catIndex[totalFields[j]] !== undefined &&
                        seriesIndex[totalFields[i]] !== undefined) {
                        let row: number = catIndex[totalFields[j]];
                        let col: number = seriesIndex[totalFields[i]];
                        if (columns.Y && columns.Y[col].values[row] !== null) {
                            elementValue = <number>columns.Y[col].values[row];
                        } else {
                            elementValue = ChordChart.defaultValue1;
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

            let chordLayout: Chord = d3.layout.chord()
                .padding(ChordChart.ChordLayoutPadding)
                .matrix(renderingDataMatrix);

            let labelDataPoints: ChordArcDescriptor[],
                chordLayoutGroups: ChordGroup[] = chordLayout.groups(),
                groups: ChordGroup[] = ChordChart.copyArcDescriptorsWithoutNaNValues(chordLayoutGroups),
                chords: ChordLink[] = chordLayout.chords(),
                unitLength: number = Math.round(max / ChordChart.MaxUnitSize).toString().length - 1;

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
            return _.reduce(array, (total, value) => {
                return (value === undefined) ? total : total + 1;
            }, 0);
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

            this.tooltipServiceWrapper = createTooltipServiceWrapper(
                this.host.tooltipService,
                options.element);

            this.layout = new VisualLayout(ChordChart.DefaultViewPort, ChordChart.DefaultMargin);
            this.layout.minViewport = ChordChart.DefaultViewPort;

            this.svg = d3.select(options.element)
                .append('svg')
                .style('position', 'absolute')
                .classed(ChordChart.VisualClassName, true);

            let svgSelection: Selection<any> = this.mainGraphicsContext = this.svg
                .append('g');

            svgSelection
                .append('g')
                .classed('chords', true);

            this.slices = svgSelection
                .append('g')
                .classed('slices', true);

            svgSelection
                .append('g')
                .classed(ChordChart.ticksClass.class, true);

            this.labels = svgSelection
                .append('g')
                .classed(ChordChart.labelGraphicsContextClass.class, true);

            this.lines = svgSelection
                .append('g')
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
            this.layout.margin.top
                = this.layout.margin.bottom
                = PixelConverter.fromPointToPixel(this.settings.labels.fontSize) / 2;

            this.render();
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            if (!this.data ||
                !this.settings) {
                return [];
            }

            let settings: IChordChartSettings = this.settings;

            switch (options.objectName) {
                case 'axis': {
                    return ChordChart.enumerateAxis(settings);
                }
                case 'dataPoint': {
                    return ChordChart.enumerateDataPoint(settings, this.data.labelDataPoints);
                }
                case 'labels': {
                    return ChordChart.enumerateLabels(settings);
                }
                default: {
                    return [];
                }
            }
        }

        private static enumerateAxis(settings: IChordChartSettings): VisualObjectInstance[] {
            let axisSettings: IAxisSettings = settings.axis,
                instances: VisualObjectInstance[] = [{
                    objectName: 'axis',
                    displayName: 'Axis',
                    selector: null,
                    properties: {
                        show: axisSettings.show
                    }
                }];
            return instances;
        }

        private static enumerateDataPoint(
            settings: IChordChartSettings,
            labelDataPoints: ChordArcDescriptor[]): VisualObjectInstance[] {

            let dataPointSettings: IDataPointSettings = settings.dataPoint;
            let instances: VisualObjectInstance[] = [{
                objectName: 'datapoint',
                displayName: 'Data colors',
                selector: null,
                properties: {
                    defaultColor: dataPointSettings.defaultColor,
                    showAllDataPoints: dataPointSettings.showAllDataPoints
                }
            }];

            if (!dataPointSettings.showAllDataPoints) {
                return instances;
            }

            for (let labelDataPoint of labelDataPoints) {
                let data: ChordArcLabelData = labelDataPoint.data;

                let colorInstance: VisualObjectInstance = {
                    objectName: 'dataPoint',
                    displayName: data.label,
                    selector: ColorHelper.normalizeSelector((data.identity as ISelectionId).getSelector()),
                    properties: {
                        fill: { solid: { color: data.barColor } }
                    }
                };

                if (data.isCategory || data.isGrouped) {
                    instances.push(colorInstance);
                }
            }

            return instances;
        }

        private static enumerateLabels(settings: IChordChartSettings): VisualObjectInstance[] {
            let labelSettings = settings.labels,
                labels: VisualObjectInstance[] = [{
                    objectName: 'labels',
                    displayName: 'Labels',
                    selector: null,
                    properties: {
                        show: labelSettings.show,
                        color: labelSettings.color,
                        fontSize: labelSettings.fontSize
                    }
                }];

            return labels;
        }

        /* Calculate radius */
        private calculateRadius(): number {
            if (this.settings.labels.show) {
                // if we have category or data labels, use a sigmoid to blend the desired denominator from 2 to 3.
                // if we are taller than we are wide, we need to use a larger denominator to leave horizontal room for the labels.
                let hw: number = this.layout.viewportIn.height / this.layout.viewportIn.width;
                let denom: number = 2 + (1 / (1 + Math.exp(-5 * (hw - 1))));
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
                let labelLayout: ILabelLayout = this.getChordChartLabelLayout(outerArc);
                let filteredData: LabelEnabledDataPoint[] = this.getDataLabelManager().hideCollidedLabels(
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
                    'width': this.layout.viewport.width,
                    'height': this.layout.viewport.height
                });

            this.mainGraphicsContext
                .attr('transform', translate(this.layout.viewport.width / 2, this.layout.viewport.height / 2));

            let sliceShapes: UpdateSelection<ChordTicksArcDescriptor> = this.slices
                .selectAll('path' + ChordChart.sliceClass.selector)
                .data(this.getChordTicksArcDescriptors());

            let chordSelector: string = ChordChart.chordsClass.selector + ' path' + ChordChart.chordClass.selector;

            sliceShapes.enter()
                .insert('path')
                .classed(ChordChart.sliceClass.class, true);

            sliceShapes
                .style('fill', (d, i) => this.data.labelDataPoints[i].data.barColor)
                .style('stroke', (d, i) => this.data.labelDataPoints[i].data.barColor)
                .on('click', ChordChartHelpers.addContext(this, (context, d, i) => {
                    this.selectionManager.select(this.data.labelDataPoints[i].data.identity).then((ids: extensibility.ISelectionId[]) => {
                        if (ids.length > 0) {
                            this.mainGraphicsContext
                                .selectAll(chordSelector)
                                .style('opacity', ChordChart.FullOpacity);

                            this.slices
                                .selectAll('path' + ChordChart.sliceClass.selector)
                                .style('opacity', ChordChart.DimmedOpacity);

                            this.mainGraphicsContext
                                .selectAll(chordSelector)
                                .filter((d: ChordLink) => d.source.index !== i && d.target.index !== i)
                                .style('opacity', ChordChart.DimmedOpacity);

                            d3.select(context).style('opacity', ChordChart.FullOpacity);
                        } else {
                            sliceShapes.style('opacity', ChordChart.FullOpacity);

                            this.mainGraphicsContext
                                .selectAll(chordSelector)
                                .filter((d: ChordLink) => d.source.index !== i && d.target.index !== i)
                                .style('opacity', ChordChart.FullOpacity);
                        }
                    });

                    (d3.event as MouseEvent).stopPropagation();
                }))
                .transition()
                .duration(this.duration)
                .attrTween('d', ChordChartHelpers.interpolateArc(arc));

            sliceShapes
                .exit()
                .remove();

            this.tooltipServiceWrapper.addTooltip(
                sliceShapes,
                (tooltipEvent: TooltipEventArgs<ChordTicksArcDescriptor>) => {
                    return this.data.sliceTooltipData[tooltipEvent.data.index].tooltipInfo;
                });

            let path: any = d3.svg.chord()
                .radius(this.radius);

            let chordShapes: UpdateSelection<ChordLink> = this.svg.select(ChordChart.chordsClass.selector)
                .selectAll('path' + ChordChart.chordClass.selector)
                .data(this.data.chords);

            chordShapes
                .enter()
                .insert('path')
                .classed(ChordChart.chordClass.class, true);

            chordShapes
                .style({
                    'fill': (d: ChordLink) => {
                        return this.data.labelDataPoints[d.target.index].data.barColor;
                    },
                    'opacity': ChordChart.FullOpacity
                })
                .transition()
                .duration(this.duration)
                .attr('d', path as any);

            chordShapes
                .exit()
                .remove();

            this.svg
                .on('click', () => this.selectionManager.clear().then(() => {
                    sliceShapes.style('opacity', ChordChart.FullOpacity);
                    chordShapes.style('opacity', ChordChart.FullOpacity);
                }));

            this.drawTicks();
            this.drawCategoryLabels();

            this.tooltipServiceWrapper.addTooltip(
                chordShapes,
                (tooltipEvent: TooltipEventArgs<ChordLink>) => {
                    let tooltipInfo: VisualTooltipDataItem[] = [];

                    if (this.data.differentFromTo) {
                        tooltipInfo = this.data.tooltipData[tooltipEvent.data.source.index]
                        [tooltipEvent.data.source.subindex]
                            .tooltipInfo;
                    } else {
                        tooltipInfo.push(ChordChart.createTooltipInfo(
                            this.data.labelDataPoints,
                            this.data.dataMatrix,
                            tooltipEvent.data.source));

                        tooltipInfo.push(ChordChart.createTooltipInfo(
                            this.data.labelDataPoints,
                            this.data.dataMatrix,
                            tooltipEvent.data.target));
                    }

                    return tooltipInfo;
                });
        }

        private static createTooltipInfo(labelDataPoints: ChordArcDescriptor[], dataMatrix: number[][], source: any) {
            return {
                displayName: labelDataPoints[source.index].data.label
                + '->' + labelDataPoints[source.subindex].data.label,
                value: dataMatrix[source.index][source.subindex].toString()
            };
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
                format: ChordChart.DefaultFormatValue,
                value: maxValue
            });

            groups.forEach((x: ChordTicksArcDescriptor) => {
                let k: number = (x.endAngle - x.startAngle) / x.value,
                    absValue: number = Math.abs(x.value),
                    range: number[] = d3.range(0, absValue, absValue - 1 < 0.15 ? 0.15 : absValue - 1);

                if (x.value < 0) {
                    range = range.map(x => x * -1).reverse();
                }

                for (let i: number = 1; i < range.length; i++) {
                    let gapSize: number = Math.abs(range[i] - range[i - 1]) * radiusCoeff;

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
                let tickShapes: UpdateSelection<any> = this.mainGraphicsContext
                    .select(ChordChart.ticksClass.selector)
                    .selectAll('g' + ChordChart.sliceTicksClass.selector)
                    .data(this.data.groups);

                let animDuration: number = (this.data.prevAxisVisible === this.settings.axis.show)
                    ? this.duration
                    : 0;

                tickShapes
                    .enter()
                    .insert('g')
                    .classed(ChordChart.sliceTicksClass.class, true);

                let tickPairs = tickShapes
                    .selectAll('g' + ChordChart.tickPairClass.selector)
                    .data((d: ChordTicksArcDescriptor) => d.angleLabels);

                tickPairs
                    .enter()
                    .insert('g')
                    .classed(ChordChart.tickPairClass.class, true);

                tickPairs.transition()
                    .duration(animDuration)
                    .attr('transform', (d) => translateAndRotate(
                        this.innerRadius,
                        0,
                        -this.innerRadius,
                        0,
                        d.angle * 180 / Math.PI - 90));

                tickPairs
                    .selectAll('line' + ChordChart.tickLineClass.selector)
                    .data((d) => [d])
                    .enter()
                    .insert('line')
                    .classed(ChordChart.tickLineClass.class, true)
                    .style('stroke', ChordChart.DefaultTickLineColorValue)
                    .attr('x1', 1)
                    .attr('y1', 0)
                    .attr('x2', 5)
                    .attr('y2', 0);

                tickPairs
                    .selectAll('text' + ChordChart.tickTextClass.selector)
                    .data((d) => [d])
                    .enter()
                    .insert('text')
                    .classed(ChordChart.tickTextClass.class, true)
                    .attr('x', ChordChart.DefaultTickShiftX)
                    .attr('dy', ChordChart.DefaultDY);

                tickPairs
                    .selectAll('text' + ChordChart.tickTextClass.selector)
                    .text(d => d.label)
                    .style('text-anchor', d => d.angle > Math.PI ? 'end' : null)
                    .attr('transform', d => d.angle > Math.PI ? 'rotate(180)translate(-16)' : null);

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

            // Check for a case where resizing leaves no labels - then we need to remove the labels 'g'
            if (filteredData.length === 0) {
                dataLabelUtils.cleanDataLabels(this.labels, true);

                return null;
            }

            // line chart ViewModel has a special 'key' property for point identification since the 'identity' field is set to the series identity
            let hasKey: boolean = (<any>filteredData)[0].key !== null;
            let hasDataPointIdentity: boolean = (<any>filteredData)[0].identity !== null;
            let dataLabels: UpdateSelection<ChordLabelEnabledDataPoint> = this.labels.selectAll(ChordChart.labelsClass.selector).data(filteredData);

            let newLabels = dataLabels.enter()
                .append('text')
                .classed(ChordChart.labelsClass.class, true);

            if (forAnimation) {
                newLabels.style('opacity', 0);
            }

            dataLabels
                .attr({
                    x: (d: LabelEnabledDataPoint) => d.labelX,
                    y: (d: LabelEnabledDataPoint) => d.labelY,
                    dy: ChordChart.DefaultDY
                })
                .text((d: LabelEnabledDataPoint) => d.labeltext)
                .style(layout.style as any);

            dataLabels
                .exit()
                .remove();
        }

        private renderLines(filteredData: ChordLabelEnabledDataPoint[], arc: SvgArc<Arc>, outerArc: SvgArc<Arc>): void {
            let lines: UpdateSelection<ChordLabelEnabledDataPoint> = this.lines
                .selectAll('polyline')
                .data(filteredData);

            let midAngle = (d: ChordArcDescriptor) => d.startAngle + (d.endAngle - d.startAngle) / 2;

            lines.enter()
                .append('polyline')
                .classed(ChordChart.lineClass.class, true);

            lines
                .attr('points', (d: ChordArcDescriptor): any => {
                    let textPoint: [number, number] = outerArc.centroid(d as any);

                    textPoint[0] = (this.radius + ChordChart.LabelMargin / 2) * (midAngle(d) < Math.PI ? 1 : -1);

                    let midPoint: [number, number] = outerArc.centroid(d as any);
                    let chartPoint: [number, number] = arc.centroid(d as any);

                    chartPoint[0] *= ChordChart.InnerLinePointMultiplier;
                    chartPoint[1] *= ChordChart.InnerLinePointMultiplier;

                    return [
                        chartPoint,
                        midPoint,
                        textPoint
                    ];
                })
                .style({
                    'opacity': ChordChart.PolylineOpacity,
                    'stroke': (d: ChordArcDescriptor) => d.data.labelColor,
                    'pointer-events': 'none'
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
                        let pos: [number, number] = outerArc.centroid(d as any);
                        return pos[1];
                    },
                },
                filter: (d: ChordArcDescriptor) => (d !== null && d.data !== null && d.data.label !== null),
                style: {
                    'fill': (d: ChordArcDescriptor) => d.data.labelColor,
                    'text-anchor': (d: ChordArcDescriptor) => midAngle(d) < Math.PI ? 'start' : 'end',
                    'font-size': (d: ChordArcDescriptor) => PixelConverter.fromPoint(this.settings.labels.fontSize),
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
