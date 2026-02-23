import { updateInTree } from "./apps/web/lib/editor/layer-utils.ts";

const initialLayers = [{
    id: "l1",
    type: "gradient",
    colors: [{ color: "#000" }, { color: "#fff" }],
    animations: [{
        keyPath: "colors",
        values: [
            [{ color: "#f00" }, { color: "#0f0" }],
            [{ color: "#00f" }, { color: "#ff0" }]
        ]
    }]
}];

const nextLayers = updateInTree(initialLayers as any, "l1", { colors: [{ color: "#000" }, { color: "#fff" }, { color: "#123" }] } as any);

console.log(JSON.stringify(nextLayers, null, 2));
