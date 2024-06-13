import {dataLabelInterfaces} from "powerbi-visuals-utils-chartutils";
import { SelectableDataPoint } from "./behavior";
import LabelEnabledDataPoint = dataLabelInterfaces.LabelEnabledDataPoint;

import { ChordGroup } from "d3-chord";

export interface ChordArcDescriptor extends ChordGroup, SelectableDataPoint {
    angleLabels: { angle: number, label: string }[];
    data: ChordArcLabelData;
}

export interface ChordArcLabelData extends LabelEnabledDataPoint {
    label: string;
    labelColor: string;
    barFillColor: string;
    barStrokeColor: string;
    isCategory: boolean;
    isGrouped: boolean;
}
