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

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel"
import { ChordArcDescriptor, ChordArcLabelData } from "./interfaces";
import { ColorHelper } from "powerbi-visuals-utils-colorutils";
import Model = formattingSettings.Model;
import Card = formattingSettings.SimpleCard;
import CompositeCard = formattingSettings.CompositeCard;
import Group = formattingSettings.Group;
import ValidatorType = powerbi.visuals.ValidatorType;
import ISelectionId = powerbi.visuals.ISelectionId;

class AxisSettingsCard extends CompositeCard {
    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Show",
        displayNameKey: "Visual_Show",
        value: true,
    });

    color = new formattingSettings.ColorPicker({
        name: "color",
        displayName: "Color",
        displayNameKey: "Visual_Color",
        value: { value: "#212121" },
    });

    font = new formattingSettings.FontControl({
        name: "font",
        displayNameKey: "Visual_Font",
        fontSize: new formattingSettings.NumUpDown({
            name: "fontSize",
            displayName: "Text size",
            displayNameKey: "Visual_Text_Size",
            value: 12,
            options: {
                minValue: { value: 0, type: ValidatorType.Min },
            }
        }),
        fontFamily: new formattingSettings.FontPicker({
            name: "fontFamily",
            value: "Arial, sans-serif"
        }),
        bold: new formattingSettings.ToggleSwitch({
            name: "bold",
            value: false,
        }),
        italic: new formattingSettings.ToggleSwitch({
            name: "italic",
            value: false,
        }),
        underline: new formattingSettings.ToggleSwitch({
            name: "underline",
            value: false,
        }),
    });

    rotateTicks = new formattingSettings.ToggleSwitch({
        name: "rotateTicks",
        displayName: "Rotate ticks",
        displayNameKey: "Visual_Rotate_Ticks",
        value: true,
    });

    hideOverlappingTicks = new formattingSettings.ToggleSwitch({
        name: "hideOverlappingTicks",
        displayName: "Hide overlapping ticks",
        displayNameKey: "Visual_Hide_Overlapping_Ticks",
        value: false,
    });

    generalGroup = new Group({
        name: "general",
        displayName: "General",
        displayNameKey: "Visual_General",
        slices: [this.color, this.font, this.rotateTicks, this.hideOverlappingTicks],
    });

    showBackground = new formattingSettings.ToggleSwitch({
        name: "showBackground",
        displayName: "Show",
        displayNameKey: "Visual_Show",
        value: false,
    });

    backgroundColor = new formattingSettings.ColorPicker({
        name: "backgroundColor",
        displayName: "Color",
        displayNameKey: "Visual_Color",
        value: { value: "#FFFFFF" }
    });

    backgroundOpacity = new formattingSettings.Slider({
        name: "backgroundOpacity",
        displayName: "Opacity",
        displayNameKey: "Visual_Opacity",
        value: 100,
        options: {
            minValue: { value: 0, type: ValidatorType.Min },
            maxValue: { value: 100, type: ValidatorType.Max },
        }
    });

    backgroundGroup = new Group({
        name: "background",
        displayName: "Background",
        displayNameKey: "Visual_Background",
        topLevelSlice: this.showBackground,
        slices: [this.backgroundColor, this.backgroundOpacity],
    });

    name: string = "axis";
    displayName: string = "Axis";
    displayNameKey: string = "Visual_Axis";
    topLevelSlice = this.show;
    groups = [this.generalGroup, this.backgroundGroup];
}

class DataPointSettingsCard extends Card {
    defaultColor = new formattingSettings.ColorPicker({
        name: "defaultColor",
        displayName: "Default color",
        displayNameKey: "Visual_Default_Color",
        value: { value: undefined },
    });

    showAllDataPoints = new formattingSettings.ToggleSwitch({
        name: "showAllDataPoints",
        displayName: "Show all",
        displayNameKey: "Visual_Show_All",
        value: false,
    });

    name: string = "dataPoint";
    displayName: string = "Data colors";
    displayNameKey: string = "Visual_Data_Colors";
    slices = [this.defaultColor, this.showAllDataPoints];
}

class LabelsSettingsCard extends Card {
    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Show",
        displayNameKey: "Visual_Show",
        value: true,
    });

    color = new formattingSettings.ColorPicker({
        name: "color",
        displayName: "Color",
        displayNameKey: "Visual_Color",
        description: "Set the reference line data label color",
        value: { value: "#777777" },
    });

    font = new formattingSettings.FontControl({
        name: "font",
        displayNameKey: "Visual_Font",
        fontSize: new formattingSettings.NumUpDown({
            name: "fontSize",
            displayName: "Text size",
            displayNameKey: "Visual_Text_Size",
            value: 9,
            options: {
                minValue: { value: 0, type: ValidatorType.Min },
            }
        }),
        fontFamily: new formattingSettings.FontPicker({
            name: "fontFamily",
            value: "Arial, sans-serif"
        }),
        bold: new formattingSettings.ToggleSwitch({
            name: "bold",
            value: false,
        }),
        italic: new formattingSettings.ToggleSwitch({
            name: "italic",
            value: false,
        }),
        underline: new formattingSettings.ToggleSwitch({
            name: "underline",
            value: false,
        }),
    });

    name: string = "labels";
    displayName: string = "Labels";
    displayNameKey: string = "Visual_Labels";
    topLevelSlice = this.show;
    slices = [this.color, this.font];
}

class ChordSettingsCard extends Card {
    public highContrastStrokeWidth: number = 1;

    strokeColor = new formattingSettings.ColorPicker({
        name: "strokeColor",
        displayName: "Stroke color",
        displayNameKey: "Visual_StrokeColor",
        value: { value: "#000000" },
    });

    strokeWidth = new formattingSettings.NumUpDown({
        name: "strokeWidth",
        displayName: "Stroke width",
        displayNameKey: "Visual_StrokeWidth",
        value: 1,
        options: {
            minValue: { value: 0, type: ValidatorType.Min },
            maxValue: { value: 5, type: ValidatorType.Max },
        }
    });

    strokeOpacity = new formattingSettings.Slider({
        name: "strokeOpacity",
        displayName: "Stroke opacity",
        displayNameKey: "Visual_StrokeOpacity",
        value: 100,
        options: {
            minValue: { value: 0, type: ValidatorType.Min },
            maxValue: { value: 100, type: ValidatorType.Max },
        }
    });

    name: string = "chord";
    displayName: string = "Chord";
    displayNameKey: string = "Visual_Chord";
    slices = [this.strokeColor, this.strokeWidth, this.strokeOpacity];
}

export class ChordChartSettingsModel extends Model {
    axis = new AxisSettingsCard();
    dataPoint = new DataPointSettingsCard();
    labels = new LabelsSettingsCard();
    chord = new ChordSettingsCard();

    cards = [
        this.dataPoint,
        this.axis,
        this.labels,
        this.chord,
    ];

    public populateDataPoints(labelDataPoints: ChordArcDescriptor[]): void {
        if (!this.dataPoint.showAllDataPoints.value) {
            return;
        }

        const newSlices = [this.dataPoint.defaultColor, this.dataPoint.showAllDataPoints];

        for (const labelDataPoint of labelDataPoints) {
            const data: ChordArcLabelData = labelDataPoint.data;

            const colorPicker = new formattingSettings.ColorPicker({
                name: "fill",
                displayName: data.label,
                selector: ColorHelper.normalizeSelector((<ISelectionId>labelDataPoint.identity).getSelector()),
                value: { value: data.barFillColor },
            });

            if (data.isCategory || data.isGrouped) {
                newSlices.push(colorPicker);
            }
        }

        this.dataPoint.slices = newSlices;
    }
}