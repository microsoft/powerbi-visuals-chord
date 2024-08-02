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

import "regenerator-runtime/runtime.js";
import "./../style/chordChart.less";

// d3
import { sum } from "d3-array";
import { arc, Arc, DefaultArcObject } from "d3-shape";
import { chord, ribbon, Chord, Chords, ChordLayout, ChordGroup } from "d3-chord";
import { select, Selection } from "d3-selection";

// powerbi
import powerbiVisualsApi from "powerbi-visuals-api";
import DataView = powerbiVisualsApi.DataView;
import IViewport = powerbiVisualsApi.IViewport;
import DataViewObjects = powerbiVisualsApi.DataViewObjects;
import DataViewValueColumn = powerbiVisualsApi.DataViewValueColumn;
import DataViewMetadataColumn = powerbiVisualsApi.DataViewMetadataColumn;
import DataViewValueColumnGroup = powerbiVisualsApi.DataViewValueColumnGroup;
import PrimitiveValue = powerbiVisualsApi.PrimitiveValue;
import ISelectionId = powerbiVisualsApi.visuals.ISelectionId;
import DataViewValueColumns = powerbi.DataViewValueColumns;

// powerbi.extensibility
import IColorPalette = powerbiVisualsApi.extensibility.IColorPalette;
import VisualTooltipDataItem = powerbiVisualsApi.extensibility.VisualTooltipDataItem;
import IVisual = powerbiVisualsApi.extensibility.IVisual;
import IVisualHost = powerbiVisualsApi.extensibility.visual.IVisualHost;
import ILocalizationManager = powerbiVisualsApi.extensibility.ILocalizationManager;
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbiVisualsApi.extensibility.visual.VisualUpdateOptions;
import IVisualEventService = powerbiVisualsApi.extensibility.IVisualEventService;
import ISelectionManager = powerbiVisualsApi.extensibility.ISelectionManager;

// powerbi.extensibility.utils.dataview
import { converterHelper as ConverterHelper } from "powerbi-visuals-utils-dataviewutils";
import getSeriesName = ConverterHelper.getSeriesName;

// powerbi.extensibility.utils.svg
import {
  manipulation,
  IMargin,
  IRect,
  shapes,
  CssConstants,
  shapesInterfaces,
} from "powerbi-visuals-utils-svgutils";
import translate = manipulation.translate;
import ClassAndSelector = CssConstants.ClassAndSelector;
import createClassAndSelector = CssConstants.createClassAndSelector;
import translateAndRotate = manipulation.translateAndRotate;

// powerbi.extensibility.utils.color
import { ColorHelper } from "powerbi-visuals-utils-colorutils";

// powerbi.extensibility.utils.chart
import {
  dataLabelInterfaces,
  DataLabelManager,
  DataLabelArrangeGrid,
  dataLabelUtils,
} from "powerbi-visuals-utils-chartutils";
import LabelEnabledDataPoint = dataLabelInterfaces.LabelEnabledDataPoint;
import ILabelLayout = dataLabelInterfaces.ILabelLayout;
import IDataLabelInfo = dataLabelInterfaces.IDataLabelInfo;

// powerbi.extensibility.utils.formatting
import { valueFormatter as ValueFormatter } from "powerbi-visuals-utils-formattingutils";
import IValueFormatter = ValueFormatter.IValueFormatter;
import create = ValueFormatter.create;
import getFormatStringByColumn = ValueFormatter.getFormatStringByColumn;

// powerbi.extensibility.utils.type
import {
  pixelConverter as PixelConverter,
  double as TypeUtilsDouble,
} from "powerbi-visuals-utils-typeutils";

import lessWithPrecision = TypeUtilsDouble.lessWithPrecision;

// powerbi.extensibility.utils.tooltip
import {
  ITooltipServiceWrapper,
  createTooltipServiceWrapper,
} from "powerbi-visuals-utils-tooltiputils";

import { ChordArcDescriptor, ChordArcLabelData } from "./interfaces";
import { VisualLayout } from "./visualLayout";
import { ChordChartColumns, ChordChartCategoricalColumns } from "./columns";
import { createTooltipInfo } from "./tooltipBuilder";
import { ChordChartSettingsModel } from "./chordChartSettingsModel";
import { Behavior, HighlightedChord, ChordsHighlighted } from './behavior';

import { mapValues, invert, isEmpty } from "./utils";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import powerbi from 'powerbi-visuals-api';

export interface ChordChartData {
  settings: ChordChartSettingsModel;
  dataView: DataView;
  dataMatrix: number[][];
  highlightsMatrix: number[][];
  tooltipData: ChordTooltipData[][];
  sliceTooltipData: ChordTooltipData[];
  tickUnit: number;
  differentFromTo: boolean;
  defaultDataPointColor?: string;
  prevAxisVisible: boolean;

  groups: ChordArcDescriptor[];
  chords: Chords;
}


export type ChordChartCategoricalDict = NonNullable<unknown>;

export interface ChordLabelEnabledDataPoint extends LabelEnabledDataPoint {
  data?: ChordArcLabelData;
}

export interface ChordTooltipData {
  tooltipInfo: VisualTooltipDataItem[];
}

export class ChordChart implements IVisual {
  private static ChordLayoutPadding: number = 0.1;
  private static DefaultMargin: IMargin = {
    left: 10,
    right: 10,
    top: 10,
    bottom: 10,
  };
  private static DefaultViewPort: IViewport = { width: 150, height: 150 };
  private static InnerArcRadiusRatio = 0.8;
  private static InnerLinePointMultiplier: number = 2.05;
  private static LabelMargin = 10;
  private static MaxValue: number = 1000;
  private static OuterArcRadiusRatio = 0.9;
  private static PolylineOpacity = 0.5;
  private static TicksFontSize = 12;
  private static VisualClassName = "chordChart";
  private static DefaultDY: string = ".35em";
  private static DefaultTickShiftX: number = 8;
  private static MaxUnitSize: number = 5;
  private static DefaultFormatValue: string = "0.##";
  private static DefaultTickLineColorValue: string = "#000";
  private eventService: IVisualEventService;

  private static chordClass: ClassAndSelector = createClassAndSelector("chord");
  private static chordsClass: ClassAndSelector =
    createClassAndSelector("chords");
  private static labelGraphicsContextClass: ClassAndSelector =
    createClassAndSelector("labels");
  private static labelsClass: ClassAndSelector =
    createClassAndSelector("data-labels");
  private static lineClass: ClassAndSelector =
    createClassAndSelector("line-label");
  private static linesGraphicsContextClass: ClassAndSelector =
    createClassAndSelector("lines");
  private static sliceClass: ClassAndSelector = createClassAndSelector("slice");
  private static sliceTicksClass: ClassAndSelector =
    createClassAndSelector("slice-ticks");
  private static tickLineClass: ClassAndSelector =
    createClassAndSelector("tick-line");
  private static tickPairClass: ClassAndSelector =
    createClassAndSelector("tick-pair");
  private static tickTextClass: ClassAndSelector =
    createClassAndSelector("tick-text");
  private static ticksClass: ClassAndSelector = createClassAndSelector("ticks");

  private labels: Selection<any, any, any, any>;
  private lines: Selection<any, any, any, any>;
  private mainGraphicsContext: Selection<any, any, any, any>;
  private arcs: Selection<any, any, any, any>;
  private svg: Selection<any, any, any, any>;

  private colors: IColorPalette;
  public data: ChordChartData;
  private layout: VisualLayout;

  private duration: number = 250;

  private tooltipServiceWrapper: ITooltipServiceWrapper;

  private host: IVisualHost;

  private behavior: Behavior;
  private selectionManager: ISelectionManager;
  private formattingSettingsService: FormattingSettingsService;
  private settings: ChordChartSettingsModel;

  private hasHighlights: boolean;
  private hasHighlightsObject: boolean;

  private localizationManager: ILocalizationManager;

  private radius: number;
  private get innerRadius(): number {
    return this.radius * ChordChart.InnerArcRadiusRatio;
  }
  private get outerRadius(): number {
    return this.radius * ChordChart.OuterArcRadiusRatio;
  }

  private static convertCategoricalToArray(
    values: any[]
  ): ChordChartCategoricalDict {
    return mapValues(invert(values), (d: string) => parseFloat(d));
  }

  public static defaultValue1: number = 1;

  private static setHighContrastMode(settings: ChordChartSettingsModel, colorPalette?: IColorPalette): void {
    const colorHelper: ColorHelper = new ColorHelper(colorPalette);

    if (colorHelper.isHighContrast) {
    settings.axis.color.value.value = colorHelper.getHighContrastColor(
      "foreground",
      settings.axis.color.value.value
    );

    settings.dataPoint.defaultColor.value.value = colorHelper.getHighContrastColor(
      "background",
      settings.dataPoint.defaultColor.value.value
    );

    settings.labels.color.value.value = colorHelper.getHighContrastColor(
      "foreground",
      settings.labels.color.value.value
    );

    settings.chord.strokeColor.value.value = colorHelper.getHighContrastColor(
      "foreground",
      settings.chord.strokeColor.value.value
    );

    }

    if (colorPalette && colorHelper.isHighContrast) {
      settings.chord.strokeWidth.value = settings.chord.strokeWidth.options.maxValue.value;
    } else {
      settings.chord.strokeWidth.value = settings.chord.strokeWidth.options.minValue.value;
    }
  }

  /**
   * @param dataView DataView object
   * @param host PBI Host object
   * @param colors Color Palette from PBI
   * @param prevAxisVisible Indicates if the previous axis is visible
   * @param localizationManager Localization Manager
   */
  // eslint-disable-next-line max-lines-per-function
  public static CONVERTER(
    settings: ChordChartSettingsModel,
    dataView: DataView,
    host: IVisualHost,
    colors: IColorPalette,
    localizationManager: ILocalizationManager | null
  ): ChordChartData {
    this.setHighContrastMode(settings, colors);
    const columns: ChordChartColumns<ChordChartCategoricalColumns> =
      ChordChartColumns.GET_CATEGORICAL_COLUMNS(dataView);
    const sources: ChordChartColumns<DataViewMetadataColumn> =
      ChordChartColumns.GET_COLUMN_SOURCES(dataView);
    const categoricalValues: ChordChartColumns<any> =
      ChordChartColumns.GET_CATEGORICAL_VALUES(dataView);
    const prevAxisVisible = settings.axis.show.value;

    if (!categoricalValues || isEmpty(categoricalValues.Category)) {
      return null;
    }

    if (!categoricalValues.Y) {
      categoricalValues.Y = [];
      for (let i: number = 0; i < categoricalValues.Category.length; i++) {
        categoricalValues.Series.push(sources.Series.displayName + i);
        categoricalValues.Y.push(ChordChart.defaultValue1);
      }
    }

    categoricalValues.Series =
      categoricalValues.Series || ChordChartColumns.GET_SERIES_VALUES(dataView);
    let grouped: DataViewValueColumnGroup[] = null;
    if (columns.Series) {
      grouped = columns.Series.grouped();
    }

    const dataMatrix: number[][] = [];
    const highlightsMatrix: number[][] = [];
    const renderingDataMatrix: number[][] = [];
    const toolTipData: ChordTooltipData[][] = [];
    const sliceTooltipData: ChordTooltipData[] = [];
    let max: number = ChordChart.MaxValue;
    const seriesIndex: ChordChartCategoricalDict = this.convertCategoricalToArray(
      categoricalValues.Series
    ); // series index array
    const catIndex: ChordChartCategoricalDict = this.convertCategoricalToArray(
      categoricalValues.Category
    ); // index array for category names
    let isDiffFromTo: boolean = false; // boolean variable indicates that From and To are different
    const labelData: ChordArcLabelData[] = []; // label data: !important

    const colorHelper: ColorHelper = new ColorHelper(
      colors,
      { objectName: "dataPoint", propertyName: "fill" },
      settings.dataPoint.defaultColor.value.value
    );

    const totalFields: any[] = this.union_arrays(
      categoricalValues.Category,
      categoricalValues.Series
    ).reverse();

    if (
      ChordChart.getValidArrayLength(totalFields) ===
      ChordChart.getValidArrayLength(categoricalValues.Category) +
        ChordChart.getValidArrayLength(categoricalValues.Series)
    ) {
      isDiffFromTo = true;
    }

    const categoryColumnFormatter: IValueFormatter = create({
      format:
        getFormatStringByColumn(sources.Category, true) ||
        sources.Category.format,
    });
    const seriesColumnFormatter: IValueFormatter = create({
      format:
        sources.Series &&
        (getFormatStringByColumn(sources.Series, true) ||
          sources.Series.format),
    });
    const valueColumnFormatter: IValueFormatter = create({
      format: sources.Y
        ? getFormatStringByColumn(sources.Y, true) || sources.Y.format
        : "0",
    });

    const selectionIds: ISelectionId[] = [];

    for (let i: number = 0, iLength: number = totalFields.length; i < iLength; i++) {
      let selectionId: ISelectionId = null;
      let barFillColor: string = "";
      let isCategory: boolean = false;
      let index: number;

      const label: string =
        sources.Series && i < categoricalValues.Series.length
          ? seriesColumnFormatter.format(totalFields[i])
          : categoryColumnFormatter.format(totalFields[i]);

      if ((index = catIndex[totalFields[i]]) !== undefined) {
        selectionId = host
          .createSelectionIdBuilder()
          .withCategory(columns.Category, index)
          .createSelectionId();

        isCategory = true;

        const thisCategoryObjects: DataViewObjects = columns.Category.objects
          ? columns.Category.objects[index]
          : undefined;

        barFillColor = colorHelper.getColorForSeriesValue(
          thisCategoryObjects,
          categoricalValues.Category[index]
        );
      } else if ((index = seriesIndex[totalFields[i]]) !== undefined) {
        const seriesObjects: DataViewObjects = grouped
          ? grouped[index].objects
          : null;

        const seriesData: DataViewValueColumn = columns.Y
          ? columns.Y[index]
          : {
              objects: null,
              source: {
                displayName: "Value",
                queryName: "Value",
                groupName: "Value",
              },
              values: [ChordChart.defaultValue1],
            };

        const seriesNameStr: PrimitiveValue = seriesData
          ? getSeriesName(seriesData.source)
          : "Value";

        selectionId = host
          .createSelectionIdBuilder()
          .withSeries(columns.Series, grouped ? grouped[index] : null)
          .withMeasure(seriesNameStr ? seriesNameStr.toString() : null)
          .createSelectionId();
        isCategory = false;

        barFillColor = colorHelper.getColorForSeriesValue(
          seriesObjects,
          seriesNameStr ? seriesNameStr : `${ChordChart.defaultValue1}`
        );
      }

      const barStrokeColor: string = colorHelper.getHighContrastColor(
        "foreground",
        barFillColor
      );

      selectionIds.push(selectionId);

      labelData.push({
        label,
        isCategory,
        barFillColor,
        barStrokeColor,
        labelColor: settings.labels.color.value.value,
        isGrouped: !!grouped,
        labelFontSize: PixelConverter.fromPointToPixel(
          settings.labels.fontSize.value
        ),
      });

      renderingDataMatrix.push([]);
      dataMatrix.push([]);
      toolTipData.push([]);
      highlightsMatrix.push([]);

      for (let j: number = 0, jLength: number = totalFields.length; j < jLength; j++) {
        let elementValue: number = 0;
        let highlightsValue: number = 0;
        let tooltipInfo: VisualTooltipDataItem[] = [];

        if (catIndex[totalFields[i]] !== undefined && seriesIndex[totalFields[j]] !== undefined) {
          const row: number = catIndex[totalFields[i]];
          const col: number = seriesIndex[totalFields[j]];

          if (columns.Y && columns.Y[col].values[row] !== null) {
            elementValue = <number>columns.Y[col].values[row];
            highlightsValue = columns.Y[col].highlights && <number>columns.Y[col].highlights[row] || 0;

            if (elementValue > max) {
              max = elementValue;
            }

            tooltipInfo = createTooltipInfo(
              dataView.categorical,
              label,
              valueColumnFormatter.format(elementValue),
              col,
              row,
              localizationManager
            );
          } else if (!columns.Y) {
            max = ChordChart.defaultValue1;
            elementValue = ChordChart.defaultValue1;
            tooltipInfo = createTooltipInfo(
              dataView.categorical,
              label,
              valueColumnFormatter.format(`${ChordChart.defaultValue1}`),
              col,
              row,
              localizationManager
            );
          }
        } else if (
          isDiffFromTo &&
          catIndex[totalFields[j]] !== undefined &&
          seriesIndex[totalFields[i]] !== undefined
        ) {
          const row: number = catIndex[totalFields[j]];
          const col: number = seriesIndex[totalFields[i]];

          if (columns.Y && columns.Y[col].values[row] !== null) {
            elementValue = <number>columns.Y[col].values[row];
            highlightsValue = columns.Y[col].highlights && <number>columns.Y[col].highlights[row] || 0;
          } else if (!columns.Y) {
            elementValue = ChordChart.defaultValue1;
          }
        }

        renderingDataMatrix[i].push(Math.max(elementValue || 0, 0));
        dataMatrix[i].push(elementValue || 0);
        highlightsMatrix[i].push(highlightsValue);
        toolTipData[i].push({
          tooltipInfo: tooltipInfo,
        });
      }

      const totalSum: number = sum(dataMatrix[i]);

      sliceTooltipData.push({
        tooltipInfo: [
          {
            displayName: label,
            value: valueColumnFormatter.format(totalSum),
          },
        ],
      });
    }

    const chordLayout: ChordLayout = chord();
    chordLayout.padAngle(ChordChart.ChordLayoutPadding);
    const chords: Chords = chordLayout(renderingDataMatrix);

    const highlightedChords: HighlightedChord[] = chords.map((chord) => Object.assign({}, chord, { hasHighlight: false }) );
    const chordsWithHighlight: ChordsHighlighted = Object.assign(chords, { highlightedChords: highlightedChords });

    const groups: ChordArcDescriptor[] = ChordChart.getChordArcDescriptors(
      ChordChart.COPY_ARC_DESCRIPTORS_WITHOUT_NAN_VALUES(chordsWithHighlight.groups),
      labelData,
      selectionIds
    );

    const unitLength: number =
      Math.round(max / ChordChart.MaxUnitSize).toString().length - 1;

    return {
      dataMatrix: dataMatrix,
      highlightsMatrix: highlightsMatrix,
      dataView: dataView,
      settings: settings,
      tooltipData: toolTipData,
      sliceTooltipData: sliceTooltipData,
      tickUnit: Math.pow(10, unitLength),
      differentFromTo: isDiffFromTo,
      prevAxisVisible:
        prevAxisVisible === undefined ? settings.axis.show.value : prevAxisVisible,
      groups: groups,
      chords: chordsWithHighlight,
    };
  }

  // Check every element of the array and returns the count of elements which are valid(not undefined)
  private static getValidArrayLength(array: any[]): number {
    return array.reduce((total, value) => value === undefined ? total : total + 1, 0);
  }

  private static getChordArcDescriptors(
    groups: ChordGroup[],
    datum: ChordArcLabelData[],
    selectionIds: ISelectionId[]
  ): ChordArcDescriptor[] {
    return groups.map((arcGroup: ChordGroup, index: number): ChordArcDescriptor => {
      return Object.assign(arcGroup, {
        data: datum[index],
        identity: selectionIds[index],
        angleLabels: null,
        selected: false
      })
    });
  }

  constructor(options: VisualConstructorOptions) {
    this.host = options.host;

    this.selectionManager = this.host.createSelectionManager();
    this.behavior = new Behavior(this.selectionManager);
    this.formattingSettingsService = new FormattingSettingsService(this.localizationManager);

    this.localizationManager = this.host.createLocalizationManager();

    this.tooltipServiceWrapper = createTooltipServiceWrapper(
      this.host.tooltipService,
      options.element
    );

    this.layout = new VisualLayout(
      ChordChart.DefaultViewPort,
      ChordChart.DefaultMargin
    );
    this.layout.minViewport = ChordChart.DefaultViewPort;

    this.svg = select(options.element)
      .append("svg")
      .style("position", "absolute")
      .classed(ChordChart.VisualClassName, true);

    const svgSelection: Selection<any, any, any, any> =
      (this.mainGraphicsContext = this.svg.append("g"));

    svgSelection.append("g").classed("chords", true);

    this.arcs = svgSelection.append("g").classed("slices", true);

    svgSelection.append("g").classed(ChordChart.ticksClass.className, true);

    this.labels = svgSelection
      .append("g")
      .classed(ChordChart.labelGraphicsContextClass.className, true);

    this.lines = svgSelection
      .append("g")
      .classed(ChordChart.linesGraphicsContextClass.className, true);

    this.colors = options.host.colorPalette;
    this.eventService = options.host.eventService;
  }

  // Called for data, size, formatting changes
  public update(options: VisualUpdateOptions): void {
    this.eventService.renderingStarted(options);
    try {
      // assert dataView
      if (!options.dataViews || !options.dataViews[0]) {
        return;
      }

      this.layout.viewport = options.viewport;

      this.settings = this.formattingSettingsService.populateFormattingSettingsModel(ChordChartSettingsModel, options.dataViews[0]);

      this.data = ChordChart.CONVERTER(
        this.settings,
        options.dataViews[0],
        this.host,
        this.colors,
        this.localizationManager
      );
      this.hasHighlights = this.dataViewHasHighlights(options.dataViews[0]);
      this.hasHighlightsObject = this.dataViewHasHighlightsObject(options.dataViews[0]);

      if (!this.data) {
        this.clear();

        return;
      }

      this.layout.resetMargin();
      this.layout.margin.top = this.layout.margin.bottom =
        PixelConverter.fromPointToPixel(this.settings.labels.fontSize.value) / 2;

      this.render();
      this.eventService.renderingFinished(options);
    } catch (e) {
      this.eventService.renderingFailed(options, e);
    }
  }

  public getFormattingModel(): powerbi.visuals.FormattingModel {
    this.settings.populateDataPoints(this.data.groups);
    return this.formattingSettingsService.buildFormattingModel(this.settings);
  }

  private dataViewHasHighlights(dataView: DataView): boolean {
      const values = (dataView?.categorical?.values?.length && dataView.categorical.values) || <DataViewValueColumns>[];
      const highlightsExist = values.some(({ highlights }) => highlights?.some(Number.isInteger));
      return !!highlightsExist;
  }

  private dataViewHasHighlightsObject(dataView: DataView): boolean {
    const values = (dataView?.categorical?.values?.length && dataView.categorical.values) || <DataViewValueColumns>[];
    let highlightsObjectExists = false;
    for (const valuesArray of values) {
      if (valuesArray.highlights && valuesArray.highlights.length) {
        highlightsObjectExists = true;
        break;
      }
    }

    return highlightsObjectExists;
  }

  // Calculate radius
  private calculateRadius(): number {
    if (this.settings.labels.show.value) {
      // if we have category or data labels, use a sigmoid to blend the desired denominator from 2 to 3.
      // if we are taller than we are wide, we need to use a larger denominator to leave horizontal room for the labels.
      const hw: number =
        this.layout.viewportIn.height / this.layout.viewportIn.width;
      const denom: number = 2 + 1 / (1 + Math.exp(-5 * (hw - 1)));
      return (
        Math.min(this.layout.viewportIn.height, this.layout.viewportIn.width) /
        denom
      );
    }

    // no labels
    return (
      Math.min(this.layout.viewportIn.height, this.layout.viewportIn.width) / 2
    );
  }

  private drawCategoryLabels(): void {
    // Multiplier to place the end point of the reference line at 0.05 * radius away from the outer edge of the chord/pie.
    const arcVal: Arc<any, DefaultArcObject> = arc()
      .innerRadius(0)
      .outerRadius(this.innerRadius);

    const outerArc: Arc<any, DefaultArcObject> = arc()
      .innerRadius(this.outerRadius)
      .outerRadius(this.outerRadius);

    if (this.settings.labels.show.value) {
      const labelLayout: ILabelLayout = this.getChordChartLabelLayout(outerArc);
      const filteredData: LabelEnabledDataPoint[] =
        this.getDataLabelManager().hideCollidedLabels(
          this.layout.viewportIn,
          this.data.groups,
          labelLayout,
          /* addTransform */ true
        );

      this.renderLabels(filteredData, labelLayout);
      this.renderLines(filteredData, arcVal, outerArc);
    } else {
      dataLabelUtils.cleanDataLabels(this.labels);
      dataLabelUtils.cleanDataLabels(this.lines, true);
    }
  }

  private getDataLabelManager(): DataLabelManager {
    const dataLabelManager = new DataLabelManager();
    (<any>dataLabelManager).hasCollisions =
      hasCollisions.bind(dataLabelManager);
    return dataLabelManager;

    function hasCollisions(
      arrangeGrid: DataLabelArrangeGrid,
      info: IDataLabelInfo,
      position: IRect,
      size: shapesInterfaces.ISize
    ) {
      if (arrangeGrid.hasConflict(position)) {
        return true;
      }

      let intersection = {
        left: 0,
        top: position.height / 2,
        width: size.width,
        height: size.height,
      };
      intersection = shapes.inflate(intersection, {
        left: DataLabelManager.InflateAmount,
        top: 0,
        right: DataLabelManager.InflateAmount,
        bottom: 0,
      });
      intersection = shapes.intersect(intersection, position);

      if (shapes.isEmpty(intersection)) {
        return true;
      }

      return lessWithPrecision(intersection.height, position.height / 2);
    }
  }

  // eslint-disable-next-line max-lines-per-function
  private render(): void {
    this.radius = this.calculateRadius();
    const arcVal: Arc<any, DefaultArcObject> = arc()
      .innerRadius(this.radius)
      .outerRadius(this.innerRadius);
    this.svg
      .attr("width", this.layout.viewport.width)
      .attr("height", this.layout.viewport.height);
    this.mainGraphicsContext.attr(
      "transform",
      translate(this.layout.viewport.width / 2, this.layout.viewport.height / 2)
    );
    let arcShapes: Selection<any, ChordArcDescriptor, any, any> =
      this.arcs
        .selectAll("path" + ChordChart.sliceClass.selectorName)
        .data(this.getChordTicksArcDescriptors());
    arcShapes.exit().remove();
    arcShapes = arcShapes.merge(
      arcShapes
        .enter()
        .append("path")
        .classed(ChordChart.sliceClass.className, true)
    );
    arcShapes
      .style("fill", (d) => d.data.barFillColor)
      .style("stroke", (d) => d.data.barStrokeColor)
      .attr("tabindex", 0)
      .attr("d", (d) => arcVal(<any>d));
    this.tooltipServiceWrapper.addTooltip(
      arcShapes,
      (tooltipEvent: ChordArcDescriptor) => {
        return this.data.sliceTooltipData[tooltipEvent.index].tooltipInfo;
      }
    );
    const path: any = ribbon().radius(this.radius);
    let chordShapes: Selection<any, Chord, any, any> = this.svg
      .select(ChordChart.chordsClass.selectorName)
      .selectAll(ChordChart.chordClass.selectorName)
      .data(this.data.chords);
    chordShapes.exit().remove();
    chordShapes = chordShapes.merge(
      chordShapes
        .enter()
        .append("path")
        .classed(ChordChart.chordClass.className, true)
    );
    chordShapes
      .style("fill", (chordLink: Chord) => this.data.groups[chordLink.target.index].data.barFillColor)
      .style("stroke", this.settings.chord.strokeColor.value.value)
      .style(
        "stroke-width",
        PixelConverter.toString(this.settings.chord.strokeWidth.value)
      )
      .attr("d", path);
    this.drawTicks();
    this.drawCategoryLabels();

    if (this.behavior && this.selectionManager) {
      this.behavior.bindEvents({
        clearCatcherSelection: this.svg,
        arcSelection: arcShapes,
        chordSelection: chordShapes,
        dataPoints: this.data.groups,
        hasHighlights: this.hasHighlights,
        hasHighlightsObject: this.hasHighlightsObject,
        highlightsMatrix: this.data.highlightsMatrix,
      })

      // Check if there is a selection or highlights, and render them if they exist
      this.behavior.syncAndRender();
    }

    this.tooltipServiceWrapper.addTooltip(chordShapes, (chordLink: Chord) => {
      let tooltipInfo: VisualTooltipDataItem[] = [];
      const index = chordLink?.source?.index;
      const subindex = chordLink?.target?.index;
      if (this.data.differentFromTo) {
        if (index !== undefined && subindex !== undefined) {
          tooltipInfo = this.data.tooltipData[subindex][index]?.tooltipInfo;
        }
      } else {
        tooltipInfo.push(
          ChordChart.createTooltipInfo(
            this.data.groups,
            this.data.dataMatrix,
            index,
            subindex
          )
        );
        tooltipInfo.push(
          ChordChart.createTooltipInfo(
            this.data.groups,
            this.data.dataMatrix,
            subindex,
            index
          )
        );
      }
      return tooltipInfo;
    });
  }

  private static createTooltipInfo(
    labelDataPoints: ChordArcDescriptor[],
    dataMatrix: number[][],
    index: number,
    subindex: number
  ) {
    return {
      displayName:
        labelDataPoints[index]?.data?.label +
        "->" +
        labelDataPoints[subindex]?.data?.label,
      value: dataMatrix[index][subindex].toString(),
    };
  }

  private clear(): void {
    this.clearNodes([
      ChordChart.chordClass,
      ChordChart.sliceClass,
      ChordChart.sliceTicksClass,
      ChordChart.labelsClass,
      ChordChart.lineClass,
    ]);
  }

  private clearTicks(): void {
    this.clearNodes([
      ChordChart.tickLineClass,
      ChordChart.tickPairClass,
      ChordChart.tickTextClass,
      ChordChart.sliceTicksClass,
    ]);
  }

  private clearNodes(selectors: ClassAndSelector | ClassAndSelector[]): void {
    if (!Array.isArray(selectors)) selectors = [selectors];

    for (const selector of selectors) {
      ChordChart.clearNode(this.mainGraphicsContext, selector);
    }
  }

  private static clearNode(
    selector: Selection<any, any, any, any>,
    d: ClassAndSelector
  ): void {
    const empty: any[] = [];
    const selectors: Selection<any, any, any, any> = selector
      .selectAll(d.selectorName)
      .data(empty);

    selectors.exit().remove();
  }

  private getChordTicksArcDescriptors(): ChordArcDescriptor[] {
    const groups: ChordGroup[] = this.data.groups;
    const chords: Chords = this.data.chords;

    const maxValue = isEmpty(groups) ? 0 : Math.max.apply(null, groups.map((g: ChordGroup) => g.value));

    const formatter: IValueFormatter = create({
      format: ChordChart.DefaultFormatValue,
      value: maxValue,
    });

    groups.forEach((x: ChordArcDescriptor) => {
      const sourceChords = chords
        .filter((chord: Chord) => chord.source.index === x.index)
        .map((chord: Chord) => chord.source.value)

      const targetChords = chords
        .filter((chord: Chord) => chord.target.index === x.index)
        .map((chord: Chord) => chord.target.value)

      for (let i = 1; i < sourceChords.length; i++) {
        sourceChords[i] = sourceChords[i] + sourceChords[i - 1];
      }

      for (let i = 1; i < targetChords.length; i++) {
        targetChords[i] = targetChords[i] + targetChords[i - 1];
      }

      const rangeValue: number[] = [0].concat(sourceChords, targetChords);

      const k: number = (x.endAngle - x.startAngle) / x.value;
      x.angleLabels = rangeValue.map(
        (v) =>
          <any>{ angle: v * k + x.startAngle, label: formatter.format(v) }
      );
    });

    return <ChordArcDescriptor[]>groups;
  }

  public static COPY_ARC_DESCRIPTORS_WITHOUT_NAN_VALUES(
    arcDescriptors: ChordGroup[] | null | undefined
  ): ChordGroup[] {
    if (isEmpty(arcDescriptors)) {
      return arcDescriptors;
    }

    return arcDescriptors.map((sourceArcDescriptor: ChordGroup) => {
      const targetArcDescriptor: ChordGroup = <ChordGroup>{};

      for (const propertyName of Object.keys(sourceArcDescriptor)) {
        if (
          !sourceArcDescriptor[propertyName] &&
          isNaN(sourceArcDescriptor[propertyName])
        ) {
          targetArcDescriptor[propertyName] = 0;
        } else {
          targetArcDescriptor[propertyName] = sourceArcDescriptor[propertyName];
        }
      }

      return targetArcDescriptor;
    });
  }

  // Draw axis(ticks) around the arc
  private drawTicks(): void {
    if (this.settings.axis.show.value) {

      let tickShapes: Selection<any, any, any, any> =
        this.mainGraphicsContext
          .select(ChordChart.ticksClass.selectorName)
          .selectAll("g" + ChordChart.sliceTicksClass.selectorName)
          .data(this.data.groups);

      tickShapes.exit().remove();

      tickShapes = tickShapes.merge(
        tickShapes
          .enter()
          .append("g")
          .classed(ChordChart.sliceTicksClass.className, true)
      );

      let tickPairs = tickShapes
        .selectAll("g" + ChordChart.tickPairClass.selectorName)
        .data((d: ChordArcDescriptor) => d.angleLabels);

      tickPairs.exit().remove();

      tickPairs = tickPairs.merge(
        tickPairs
          .enter()
          .append("g")
          .classed(ChordChart.tickPairClass.className, true)
      );

      tickPairs.attr("transform", (d) =>
        translateAndRotate(
          this.innerRadius,
          0,
          -this.innerRadius,
          0,
          (d.angle * 180) / Math.PI - 90
        )
      );

      let tickLines = tickPairs
        .selectAll("line" + ChordChart.tickLineClass.selectorName)
        .data((d) => [d]);

      tickLines.exit().remove();
      tickLines = tickLines.merge(
        tickLines
          .enter()
          .append("line")
          .classed(ChordChart.tickLineClass.className, true)
      );

      tickLines
        .style("stroke", this.settings.axis.color?.value?.value || ChordChart.DefaultTickLineColorValue)
        .attr("x1", 1)
        .attr("y1", 0)
        .attr("x2", 5)
        .attr("y2", 0)
        .merge(tickLines);

      let tickText = tickPairs
        .selectAll("text" + ChordChart.tickTextClass.selectorName)
        .data((d) => [d]);

      tickText.exit().remove();

      tickText = tickText.merge(tickText.enter().append("text"));

      tickText
        .classed(ChordChart.tickTextClass.className, true)
        .attr("x", ChordChart.DefaultTickShiftX)
        .attr("dy", ChordChart.DefaultDY)
        .text((d) => (<any>d).label)
        .style("text-anchor", (d) => ((<any>d).angle > Math.PI ? "end" : null))
        .style("fill", this.settings.axis.color.value.value)
        .attr("transform", (d) =>
          (<any>d).angle > Math.PI ? "rotate(180)translate(-16)" : null
        );
    } else {
      this.clearTicks();
    }
  }

  private renderLabels(
    filteredData: ChordLabelEnabledDataPoint[],
    layout: ILabelLayout,
    forAnimation: boolean = false
  ): void {
    // Check for a case where resizing leaves no labels - then we need to remove the labels "g"
    if (filteredData.length === 0) {
      dataLabelUtils.cleanDataLabels(this.labels, true);

      return null;
    }

    // line chart ViewModel has a special "key" property for point identification since the "identity" field is set to the series identity

    let dataLabels: Selection<
      any,
      ChordLabelEnabledDataPoint,
      any,
      any
    > = this.labels
      .selectAll(ChordChart.labelsClass.selectorName)
      .data(filteredData);

    dataLabels.exit().remove();

    dataLabels = dataLabels.merge(
      dataLabels
        .enter()
        .append("text")
        .classed(ChordChart.labelsClass.className, true)
    );

    const newLabels = dataLabels;

    if (forAnimation) {
      newLabels.style("opacity", 0);
    }

    dataLabels
      .attr("x", (d: LabelEnabledDataPoint) => d.labelX)
      .attr("y", (d: LabelEnabledDataPoint) => d.labelY)
      .attr("dy", ChordChart.DefaultDY)
      .text((d: LabelEnabledDataPoint) => d.labeltext);

    Object.keys(layout.style).forEach((x) =>
      dataLabels.style(x, layout.style[x])
    );
  }

  private renderLines(
    filteredData: ChordLabelEnabledDataPoint[],
    arcVal: Arc<any, DefaultArcObject>,
    outerArc: Arc<any, DefaultArcObject>
  ): void {
    let lines: Selection<any, ChordLabelEnabledDataPoint, any, any> =
      this.lines.selectAll("polyline").data(filteredData);

    const midAngle = (d: ChordArcDescriptor) =>
      d.startAngle + (d.endAngle - d.startAngle) / 2;

    lines.exit().remove();

    lines = lines.merge(
      lines
        .enter()
        .append("polyline")
        .classed(ChordChart.lineClass.className, true)
    );

    lines
      .attr("points", (d: ChordArcDescriptor): any => {
        const textPoint: [number, number] = outerArc.centroid(<any>d);

        textPoint[0] =
          (this.radius + ChordChart.LabelMargin / 2) *
          (midAngle(d) < Math.PI ? 1 : -1);

        const midPoint: [number, number] = outerArc.centroid(<any>d);
        const chartPoint: [number, number] = arcVal.centroid(<any>d);

        chartPoint[0] *= ChordChart.InnerLinePointMultiplier;
        chartPoint[1] *= ChordChart.InnerLinePointMultiplier;

        return [chartPoint, midPoint, textPoint];
      })
      .style("opacity", ChordChart.PolylineOpacity)
      .style("stroke", (d: ChordArcDescriptor) => d.data.labelColor)
      .style("pointer-events", "none");
  }

  // Get label layout
  private getChordChartLabelLayout(
    outerArc: Arc<any, DefaultArcObject>
  ): ILabelLayout {
    const midAngle = (d: ChordArcDescriptor) =>
      d.startAngle + (d.endAngle - d.startAngle) / 2;
    const maxLabelWidth: number =
      (this.layout.viewportIn.width -
        this.radius * 2 -
        ChordChart.LabelMargin * 2) /
      1.6;

    return {
      labelText: (d: ChordLabelEnabledDataPoint) => {
        // show only category label
        return dataLabelUtils.getLabelFormattedText({
          label: d.data.label,
          maxWidth: maxLabelWidth,
          fontSize: PixelConverter.fromPointToPixel(
            this.settings.labels.fontSize.value
          ),
        });
      },
      labelLayout: {
        x: (d: ChordArcDescriptor) =>
          (this.radius + ChordChart.LabelMargin) *
          (midAngle(d) < Math.PI ? 1 : -1),
        y: (d: ChordArcDescriptor) => {
          const pos: [number, number] = outerArc.centroid(<any>d);
          return pos[1];
        },
      },
      filter: (d: ChordArcDescriptor) =>
        d !== null && d.data !== null && d.data.label !== null,
      style: {
        fill: (d: ChordArcDescriptor) => d.data.labelColor,
        "text-anchor": (d: ChordArcDescriptor) =>
          midAngle(d) < Math.PI ? "start" : "end",
        "font-size": () =>
          PixelConverter.fromPoint(this.settings.labels.fontSize.value),
      },
    };
  }

  // Utility function for union two arrays without duplicates
  private static union_arrays(x: any[], y: any[]): any[] {
    const obj: object = {};

    for (let i: number = 0; i < x.length; i++) {
      obj[x[i]] = x[i];
    }

    for (let i: number = 0; i < y.length; i++) {
      obj[y[i]] = y[i];
    }

    const res: string[] = [];

    for (const k of Object.keys(obj)) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        // <-- optional
        res.push(obj[k]);
      }
    }
    return res;
  }
}
