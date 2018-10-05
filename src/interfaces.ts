// powerbi.extensibility.utils.interactivity
import { interactivityService } from "powerbi-visuals-utils-interactivityutils";
import SelectableDataPoint = interactivityService.SelectableDataPoint;

import {dataLabelInterfaces} from "powerbi-visuals-utils-chartutils";
import LabelEnabledDataPoint = dataLabelInterfaces.LabelEnabledDataPoint;

import ChordGroup = d3.ChordGroup;

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
