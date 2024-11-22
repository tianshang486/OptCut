import Konva from 'konva';

export async function createText(text_list: any[],simpleText: any, layer: any, stage: any) {




// to align text in the middle of the screen, we can set the
// shape offset to the center of the text shape after instantiating it
    simpleText.offsetX(simpleText.width() / 2);

// since this text is inside of a defined area, we can center it using
// align: 'center'
    const complexText = new Konva.Text({
        x: 20,
        y: 60,
        text:
            "COMPLEX TEXT\n\nAll the world's a stage, and all the men and women merely players. They have their exits and their entrances.",
        fontSize: 18,
        fontFamily: 'Calibri',
        fill: '#555',
        width: 300,
        padding: 20,
        align: 'center'
    });

    const rect = new Konva.Rect({
        x: 20,
        y: 60,
        stroke: '#555',
        strokeWidth: 5,
        fill: '#ddd',
        width: 300,
        height: complexText.height(),
        shadowColor: 'black',
        shadowBlur: 10,
        shadowOffsetX: 10,
        shadowOffsetY: 10,
        shadowOpacity: 0.2,
        cornerRadius: 10
    });

// add the shapes to the layer
    layer.add(simpleText);
    layer.add(rect);
    layer.add(complexText);

// add the layer to the stage
    stage.add(layer);
    return stage;
}