import{a as u,f as h,e as p,c as x,j as a,N as f}from"./index-Wo41H5bh.js";import{c as o}from"./createLucideIcon-foOATjnS.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=o("Bell",[["path",{d:"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9",key:"1qo2s2"}],["path",{d:"M10.3 21a1.94 1.94 0 0 0 3.4 0",key:"qgo35s"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=o("House",[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"1d0kgt"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=o("MessageCircle",[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z",key:"vv11sd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=o("User",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]),j=()=>{const l=u(),{chats:i}=h(),{unreadCount:r}=p(),{user:s}=x(),n=s?i.filter(e=>e.unread).length:0,c=[{icon:g,label:"Home",path:"/"},{icon:m,label:"Notifications",path:"/notifications",requiresAuth:!0},{icon:b,label:"Chats",path:"/chats",requiresAuth:!0},{icon:v,label:"Profile",path:"/profile",requiresAuth:!0}],d=(e,t)=>{l.pathname===t&&(e.preventDefault(),window.scrollTo({top:0,behavior:"smooth"}))};return a.jsx("nav",{className:"fixed bottom-0 left-0 right-0 z-50 pb-safe",children:a.jsx("div",{className:"glass-strong border-t mx-4 mb-4 rounded-3xl shadow-lg",children:a.jsx("div",{className:"flex items-center justify-around px-6 py-4",children:c.map(e=>a.jsxs(f,{to:e.path,onClick:t=>d(t,e.path),className:({isActive:t})=>`flex flex-col items-center gap-1 p-2 rounded-2xl transition-apple ${t?"text-primary scale-110":"text-muted-foreground hover:text-foreground"} ${e.requiresAuth&&!s?"opacity-50 cursor-not-allowed":""}`,tabIndex:e.requiresAuth&&!s?-1:0,"aria-disabled":e.requiresAuth&&!s,children:[a.jsxs("div",{className:"relative",children:[a.jsx(e.icon,{className:"h-6 w-6"}),e.label==="Chats"&&n>0&&a.jsx("span",{className:"absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-4 text-center font-semibold",children:n}),e.label==="Notifications"&&r>0&&a.jsx("span",{className:"absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-4 text-center font-semibold",children:r})]}),a.jsx("span",{className:"text-xs font-medium",children:e.label})]},e.path))})})})};export{b as M,j as N};
