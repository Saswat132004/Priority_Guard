const L=(r)=>['L',r],U=(r)=>['U',r],C=(n)=>['c',n];
const T=(id,base,arr,dl,prog)=>({id,base,arr,dl,prog});
export const SC={
classic:{n:'Classic Priority Inversion',d:'P1 (low) locks R1. P3 (high) blocks on it. P2 (medium) preempts P1, so P3 waits on P2 indirectly.',res:{R1:{}},tasks:[T('P1',1,0,12,[C(1),L('R1'),C(3),U('R1')]),T('P2',5,3,10,[C(4)]),T('P3',10,2,8,[C(1),L('R1'),C(1),U('R1'),C(1)])]},
none:{n:'No Inversion',d:'Tasks do not contend for a resource while a lower task holds it.',res:{R1:{}},tasks:[T('P1',1,0,12,[C(2)]),T('P2',5,1,10,[C(2)]),T('P3',10,2,8,[C(2),L('R1'),C(1),U('R1')])]},
multi:{n:'Multiple Resource Contention',d:'Two resources, several waiters.',res:{R1:{},R2:{}},tasks:[T('P1',1,0,14,[L('R1'),C(2),L('R2'),C(1),U('R2'),U('R1')]),T('P2',5,1,12,[L('R2'),C(2),U('R2')]),T('P3',10,2,10,[L('R1'),C(1),U('R1')]),T('P4',7,3,11,[C(2),L('R2'),C(1),U('R2')])]},
nested:{n:'Nested Resource Inversion',d:'P3 → R1 → P1 → R2 → P2: a blocking chain.',res:{R1:{},R2:{}},tasks:[T('P1',1,0,16,[L('R1'),C(1),L('R2'),C(1),U('R2'),U('R1')]),T('P2',5,1,14,[L('R2'),C(3),U('R2')]),T('P3',10,2,12,[L('R1'),C(1),U('R1')])]},
dead:{n:'Deadlock',d:'P1 holds R1 wants R2; P2 holds R2 wants R1.',res:{R1:{},R2:{}},tasks:[T('P1',1,0,20,[L('R1'),C(1),L('R2'),C(1),U('R2'),U('R1')]),T('P2',5,1,20,[L('R2'),C(1),L('R1'),C(1),U('R1'),U('R2')])]},
starve:{n:'Starvation',d:'Low-priority P1 stays READY while higher tasks keep running.',res:{R1:{}},tasks:[T('P1',1,0,6,[C(1)]),T('P2',5,0,20,[C(3)]),T('P3',6,3,20,[C(3)]),T('P4',7,6,20,[C(3)])]}};

export const PI={NONE:'No protocol: a lower-priority owner keeps its own priority, so medium tasks can preempt it while a high task waits.',PIP:"A blocked resource owner's effective priority temporarily rises to the highest-priority waiting task. It reverts on release.",PCP:"Each resource has a ceiling (highest base priority of its users). A task may lock only if its priority exceeds the ceilings of resources held by others; the blocker inherits priority."};
