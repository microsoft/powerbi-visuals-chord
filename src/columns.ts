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

// powerbi.extensibility.utils.dataview
import { converterHelper as ConverterHelper } from "powerbi-visuals-utils-dataviewutils";

// powerbi
import powerbiVisualsApi from "powerbi-visuals-api";
import DataViewCategoryColumn = powerbiVisualsApi.DataViewCategoryColumn;
import DataViewValueColumn = powerbiVisualsApi.DataViewValueColumn;
import DataViewValueColumns = powerbiVisualsApi.DataViewValueColumns;
import DataViewMetadataColumn = powerbiVisualsApi.DataViewMetadataColumn;
import DataViewTable = powerbiVisualsApi.DataViewTable;
import DataView = powerbiVisualsApi.DataView;
import DataViewCategorical = powerbiVisualsApi.DataViewCategorical;
import DataViewCategoricalColumn = powerbiVisualsApi.DataViewCategoricalColumn;
import PrimitiveValue = powerbiVisualsApi.PrimitiveValue;

import { isEmpty, mapValues } from "./utils";

export type ChordChartCategoricalColumns = DataViewCategoryColumn & DataViewValueColumn[] & DataViewValueColumns;

export class ChordChartColumns<T> {
    public static GET_COLUMN_SOURCES(dataView: DataView): ChordChartColumns<DataViewMetadataColumn> {
        return this.getColumnSourcesT(dataView);
    }

    public static GET_TABLE_VALUES(dataView: DataView): ChordChartColumns<any> {
        const table: DataViewTable = dataView && dataView.table;
        const columns: ChordChartColumns<any> = this.getColumnSourcesT(dataView);

        return columns && table && mapValues(
            columns, (n: DataViewMetadataColumn) => n && table.rows.map(row => row[n.index]));
    }

    public static GET_TABLE_ROWS(dataView: DataView): ChordChartColumns<any>[] {
        const table: DataViewTable = dataView && dataView.table;
        const columns: ChordChartColumns<any> = this.getColumnSourcesT(dataView);
        return columns && table && table.rows.map(row =>
            mapValues(columns, (n: DataViewMetadataColumn) => n && row[n.index]));
    }

    public static GET_CATEGORICAL_VALUES(dataView: DataView): ChordChartColumns<any> {
        const categorical: DataViewCategorical = dataView && dataView.categorical;
        const categories: (DataViewCategoryColumn | DataViewValueColumn)[] = categorical && categorical.categories || [];
        if (!categorical.values || categorical.values.length === 0) {
            return null;
        }
        const values: DataViewValueColumns = categorical && categorical.values || <DataViewValueColumns>[];
        const series: PrimitiveValue[] = categorical && values.source && this.GET_SERIES_VALUES(dataView);
        return categorical && mapValues(new this<any[]>(), (n, i) =>
            (<(DataViewCategoryColumn | DataViewValueColumn)[]>categories).concat(values)
                .filter(x => x.source.roles && x.source.roles[i]).map(x => x.values)[0]
            || values.source && values.source.roles && values.source.roles[i] && series);
    }

    public static GET_SERIES_VALUES(dataView: DataView) {
        return dataView && dataView.categorical && dataView.categorical.values
            && dataView.categorical.values.map(x => ConverterHelper.getSeriesName(x.source));
    }

    public static GET_CATEGORICAL_COLUMNS(dataView: DataView): ChordChartColumns<ChordChartCategoricalColumns> {
        const categorical: DataViewCategorical = dataView && dataView.categorical;
        const categories: DataViewCategoricalColumn[] = categorical && categorical.categories || [];
        const values: DataViewValueColumns = categorical && categorical.values || <DataViewValueColumns>[];
        return categorical && mapValues(
            new this<ChordChartCategoricalColumns>(),
            (n, i) => {
                let result: any = categories.filter(x => x.source.roles && x.source.roles[i])[0];
                if (!result) {
                    result = values.source && values.source.roles && values.source.roles[i] && values;
                }
                if (!result) {
                    result = values.filter(x => x.source.roles && x.source.roles[i]);
                    if (isEmpty(result)) {
                        result = undefined;
                    }
                }

                return result;
            });
    }

    public static GET_GROUPED_VALUE_COLUMNS(dataView: DataView): ChordChartColumns<DataViewValueColumn>[] {
        const categorical = dataView && dataView.categorical;
        const values = categorical && categorical.values;
        const grouped = values && values.grouped();
        return grouped && grouped.map(g => mapValues(
            new this<DataViewValueColumn>(),
            (n, i) => g.values.filter(v => v.source.roles[i])[0]));
    }

    private static getColumnSourcesT(dataView: DataView): ChordChartColumns<any> {
        const columns = dataView && dataView.metadata && dataView.metadata.columns;
        return columns && mapValues(
            new this<any>(),
            (n, i) => columns.filter(x => x.roles && x.roles[i])[0]);
    }

    // Data Roles
    public Category: T = null;
    public Series: T = null;
    public Y: T = null;
    public CategoryLabel: T = null;
    public SeriesLabel: T = null;
}
