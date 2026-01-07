import { ConductAddComponent, ConductRegisterSystem, ConductSpawnEntity, ConductStart } from "@conduct/ecs";
import InputSystem, { listenForInput, Transform2D } from "@conduct/simulation";
import PlayerMovementSystem from "./playerMovementSystem";
import { DomRenderer } from "./domRenderer";
import DomRendererSystem from "./domRendererSystem";
import { Player } from "./player";

const player = ConductSpawnEntity();

ConductAddComponent(player, Player);
ConductAddComponent(player, Transform2D);
ConductAddComponent(player, DomRenderer, (dom) => {
  dom.elementId = 'player';
  dom.elementType = 'div';
  dom.element = document.createElement(dom.elementType);
  dom.element.setAttribute('id', dom.elementId);
  document.getElementById("conduct")?.appendChild(dom.element);
});

ConductRegisterSystem(InputSystem);
ConductRegisterSystem(PlayerMovementSystem);
ConductRegisterSystem(DomRendererSystem);

listenForInput();


ConductStart();
