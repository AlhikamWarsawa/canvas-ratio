"use client";
import { useEffect } from "react";
export function PageTurnSound(){useEffect(()=>{const onClick=(event:MouseEvent)=>{const link=(event.target as HTMLElement).closest("a[href]") as HTMLAnchorElement|null;if(!link||new URL(link.href).origin!==location.origin||new URL(link.href).pathname===location.pathname)return;const audio=new Audio("/assets/audio/book.mp3");audio.volume=.45;void audio.play().catch(()=>undefined)};document.addEventListener("click",onClick);return()=>document.removeEventListener("click",onClick)},[]);return null}
