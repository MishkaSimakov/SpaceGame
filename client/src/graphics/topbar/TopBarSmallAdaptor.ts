// import {OtherPlayer} from "@common/GameForPlayerDTO";
// import {PlayerGetters} from "@common/getters/Player";
//
// import TopBarDrawer from "./TopBarDrawer";
// import {Text} from "../engine/shapes/Text";
// import {Rectangle} from "../engine/shapes/Rectangle";
// import Color from "../Color";
// import {PlayerDataLine} from "../shapes/PlayerDataLine";
// import {TopBarAdaptor} from "./TopBarAdaptor";
// import {Group} from "../engine/Group";
// import {Shape} from "../engine/Shape";
//
// export default class TopBarSmallAdaptor extends TopBarAdaptor {
//     drawStatus(drawer: TopBarDrawer, sceneWidth: number) {
//         if (!drawer.status.text && drawer.buttons.length === 0)
//             return;
//
//         const startY = drawer.statusStartY;
//         let currentY = drawer.sizes.padding + drawer.statusStartY;
//         const shapes: (Shape | Group)[] = [];
//
//         if (drawer.status.text) {
//             drawer.status.textShape = new Text({
//                 x: sceneWidth / 2,
//                 y: currentY,
//                 text: drawer.status.text,
//                 originX: 0.5,
//                 fontFamily: "Exo2Bold",
//                 fontSize: 15,
//                 fill: "white",
//             });
//
//             currentY += drawer.status.textShape.height() + drawer.sizes.padding;
//             shapes.push(drawer.status.textShape);
//         }
//
//         if (drawer.buttons.length !== 0) {
//             const buttons = drawer.getButtonsGroup(sceneWidth - 2 * drawer.sizes.padding);
//             buttons.setAttrs({
//                 x: drawer.sizes.padding,
//                 y: currentY
//             });
//             drawer.buttonsGroup = buttons;
//
//             currentY += buttons.height() + drawer.sizes.padding;
//             shapes.push(buttons);
//         }
//
//         drawer.status.backgroundShape = new Rectangle({
//             x: -drawer.sizes.strokeWidth,
//             y: drawer.statusStartY,
//             width: sceneWidth + drawer.sizes.strokeWidth * 2,
//             height: currentY - startY,
//             fill: Color.fromHex('#0B2545', 0.75).toString(),
//             stroke: Color.fromHex('#3D76BE').toString(),
//             strokeWidth: drawer.sizes.strokeWidth,
//         });
//
//         drawer.messagesStartY = currentY;
//
//         drawer.group.add(drawer.status.backgroundShape, ...shapes);
//     }
//
//     drawCurrentPlayerData(drawer: TopBarDrawer, sceneWidth: number) {
//         if (!drawer.currentPlayer)
//             return;
//
//         drawer.currentPlayerData = new PlayerDataLine({
//             x: drawer.sizes.padding,
//             y: drawer.sizes.padding,
//             width: sceneWidth - 2 * drawer.sizes.padding,
//
//             player: PlayerGetters.forOtherPlayer(drawer.currentPlayer),
//             online: drawer.onlineMap[drawer.currentPlayer.id],
//             withName: false,
//             withTimeControl: drawer.scene.gameManager.settings.withTimeControl,
//             time: drawer.playerTime[drawer.currentPlayer.id],
//         })
//             .onClick(() => {
//                 drawer.togglePlayerCharacteristics();
//             })
//
//         let height = 2 * drawer.sizes.padding + drawer.currentPlayerData.getClientRect().height;
//
//         drawer.playersDataBackground = new Rectangle({
//             x: 0,
//             y: 0,
//             width: sceneWidth,
//             height: height,
//             fill: Color.fromHex('#0B2545', 0.75).toString()
//         });
//
//         // TODO: add line
//         // if (drawer.status.text) {
//         //     drawer.playersDataBackground.lineStyle(drawer.sizes.strokeWidth / 2, 0x3D76BE, 0.5);
//         //     drawer.playersDataBackground.lineBetween(drawer.sizes.padding, height, sceneWidth - drawer.sizes.padding, height)
//         //         .setDepth(4);
//         // } else {
//         //     drawer.playersDataBackground.lineBetween(0, height, sceneWidth, height)
//         //         .setDepth(4);
//         // }
//
//         drawer.statusStartY = height;
//         drawer.messagesStartY = height;
//
//         drawer.group.add(drawer.playersDataBackground, drawer.currentPlayerData);
//     }
//
//     drawPlayersData(drawer: TopBarDrawer, sceneWidth: number) {
//         let lineOffset = 25;
//
//         let players: OtherPlayer[] = [];
//         players.push(...drawer.otherPlayers);
//         players.push(PlayerGetters.forOtherPlayer(drawer.currentPlayer));
//
//         let topY = Infinity;
//         let bottomY = 0;
//
//         for (let [index, player] of players.entries()) {
//             let playersDataLine = new PlayerDataLine({
//                 x: drawer.sizes.padding,
//                 y: drawer.sizes.padding + lineOffset * index,
//                 width: sceneWidth - 2 * drawer.sizes.padding,
//
//                 player: player,
//                 online: drawer.onlineMap[player.id],
//                 withName: true,
//                 withTimeControl: drawer.scene.gameManager.settings.withTimeControl,
//                 time: drawer.playerTime[player.id],
//             })
//                 .onClick(() => {
//                     drawer.scene.gameManager.spaceshipsScene.panToPlayerWithId(player.id);
//                 });
//
//             drawer.playersDataText.set(player.id, playersDataLine);
//
//             let textBB = playersDataLine.getClientRect();
//             topY = Math.min(topY, textBB.top);
//             bottomY = Math.max(bottomY, textBB.bottom);
//         }
//
//         drawer.playersDataCloseText = new Text({
//             x: drawer.sizes.padding,
//             y: bottomY + lineOffset,
//             text: "Закрыть",
//             originY: 1,
//             fontFamily: "Exo2Bold",
//             fontSize: 15,
//             fill: "white"
//         })
//             .on('click', () => {
//                 drawer.togglePlayerCharacteristics();
//             });
//
//         let totalTextHeight = drawer.playersDataCloseText.getClientRect().bottom - topY;
//
//         let backgroundHeight = drawer.sizes.padding * 2 + totalTextHeight;
//
//         drawer.playersDataBackground = new Rectangle({
//             x: 0,
//             y: 0,
//             width: sceneWidth,
//             height: backgroundHeight,
//             fill: Color.fromHex('#0B2545', 0.75).toString(),
//         });
//
//         // TODO: add line and uncomment
//         //
//         // drawer.playersDataBackground.fillStyle(0x0B2545, 0.75);
//         // drawer.playersDataBackground.lineStyle(drawer.sizes.strokeWidth, 0x3D76BE);
//         //
//         // drawer.playersDataBackground.fillRect(0, 0, sceneWidth, backgroundHeight);
//
//         // if (drawer.status.text) {
//         //     drawer.playersDataBackground.lineStyle(drawer.sizes.strokeWidth / 2, 0x3D76BE, 0.5);
//         //     drawer.playersDataBackground.lineBetween(drawer.sizes.padding, backgroundHeight, sceneWidth - drawer.sizes.padding, backgroundHeight)
//         //         .setDepth(4);
//         // } else {
//         //     drawer.playersDataBackground.lineBetween(0, backgroundHeight, sceneWidth, backgroundHeight)
//         //         .setDepth(4);
//         // }
//
//         drawer.statusStartY = backgroundHeight;
//         drawer.messagesStartY = backgroundHeight;
//
//         drawer.group.add(drawer.playersDataBackground, drawer.playersDataCloseText, ...drawer.playersDataText.values());
//     }
// }
