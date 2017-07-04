/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the "Software""), to deal
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
    // powerbi.extensibility.utils.color
    import ColorHelper = powerbi.extensibility.utils.color.ColorHelper;

    // powerbi.extensibility.utils.chart.dataLabel
    import dataLabelUtils = powerbi.extensibility.utils.chart.dataLabel.utils;

    // powerbi.extensibility.utils.dataview
    import DataViewObjectsModule = powerbi.extensibility.utils.dataview.DataViewObjects;

    export interface IAxisSettings {
        show: boolean;
    }

    export interface IDataPointSettings {
        showAllDataPoints: boolean;
        defaultColor: string;
    }

    export interface ILabelsSettings {
        show: boolean;
        fontSize: number;
        color: string;
    }

    export interface IChordChartSettings {
        axis: IAxisSettings;
        dataPoint: IDataPointSettings;
        labels: ILabelsSettings;
    }

    export class ChordChartSettings {
        public static get Default() {
            return new this();
        }

        public static parse(objects: DataViewObjects, colors: IColorPalette): IChordChartSettings {
            let axisSettings: IAxisSettings = this.axis;
            let dataPointSettings: IDataPointSettings = this.dataPoint;
            let labelSettings: ILabelsSettings = this.labels;

            let defaultColor: string = dataPointSettings.defaultColor;
            if (_.has(objects, "dataPoint")
                && _.has(objects["dataPoint"], "defaultColor")) {
                defaultColor = this.getColor(
                    objects,
                    chordChartProperties.dataPoint.defaultColor,
                    dataPointSettings.defaultColor,
                    colors);
            }

            return {
                dataPoint: {
                    defaultColor: defaultColor,
                    showAllDataPoints: DataViewObjectsModule.getValue<boolean>(
                        objects,
                        chordChartProperties.dataPoint.showAllDataPoints,
                        dataPointSettings.showAllDataPoints),
                },
                axis: {
                    show: DataViewObjectsModule.getValue<boolean>(
                        objects,
                        chordChartProperties.axis.show,
                        axisSettings.show),
                },
                labels: {
                    show: DataViewObjectsModule.getValue<boolean>(
                        objects,
                        chordChartProperties.labels.show,
                        labelSettings.show),
                    fontSize: DataViewObjectsModule.getValue<number>(
                        objects,
                        chordChartProperties.labels.fontSize,
                        labelSettings.fontSize),
                    color: this.getColor(
                        objects,
                        chordChartProperties.labels.color,
                        labelSettings.color,
                        colors),
                }
            };
        }

        private static getColor(objects: DataViewObjects, properties: any, defaultColor: string, colors: IColorPalette): string {
            let colorHelper: ColorHelper = new ColorHelper(colors, properties, defaultColor);
            return colorHelper.getColorForMeasure(objects, "");
        }

        // Default Settings
        private static dataPoint: IDataPointSettings = {
            defaultColor: null,
            showAllDataPoints: false
        };

        private static axis: IAxisSettings = {
            show: true
        };

        private static labels: ILabelsSettings = {
            show: true,
            color: dataLabelUtils.defaultLabelColor,
            fontSize: dataLabelUtils.DefaultFontSizeInPt
        };
    }
}
