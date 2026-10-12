/** Approved live policy and source metadata; public input presets only. No copied operator content,
 * historical payload, credentials, private location or persistence. */
/** User explicitly authorized the existing key on 2026-10-11; bounded current
 * HTTP checks succeeded. This is authorization, not proof of account entitlement.
 * No change to paid settings, provider, automatic retries or legacy exports. */
export const ROUTE_LIVE_REVIEW={allowed:true,reason:'使用者明確指示使用現有Key；免費餘額／付費超額設定未獨立核驗',reviewedAt:'2026-10-11T11:42:05.175Z' as string|null};
export const FACILITY_LINKS=[
 {id:'east-tst',title:'尖東站無障礙資料來源',url:'https://www.mtr.com.hk/en/customer/services/free_search.php?station=80'},
 {id:'science-museum',title:'香港科學館無障礙資料來源',url:'https://hk.science.museum/en/web/scm/visit/barrier-free-facilities.html'},
 {id:'art-museum',title:'香港藝術館無障礙資料來源',url:'https://hk.art.museum/en/web/ma/visit/barrier-free-facilities.html'},
];
/** Public POIs explicitly selected in E06/E08. Input shortcuts only: neither
 * device locations nor verified accessible entrances, and never route payloads. */
export const PUBLIC_ROUTE_PLACES=[
 {id:'polyu',label:'香港理工大學',point:{lng:114.184483,lat:22.301814},address:'紅磡 · 公共地點'},
 {id:'st-teresa',label:'聖德肋撒醫院',point:{lng:114.189741,lat:22.323363},address:'九龍 · 公共地點'},
 {id:'east-tst-p1',label:'尖東站P1出入口',point:{lng:114.181003,lat:22.294218},address:'尖東 · 公共出入口'},
 {id:'science-museum',label:'香港科學館南門',point:{lng:114.182116,lat:22.297682},address:'尖東 · 公共出入口'},
 {id:'airport-t1',label:'香港國際機場T1出發',point:{lng:113.941298,lat:22.311464},address:'機場 · 公共地點'},
];
