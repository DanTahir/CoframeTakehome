"use strict";!function(){try{var e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[n]="2e5dc28f-3eea-32d7-b3d2-311611fa2a4d")}catch(e){}}();
"use strict";(self.rspackChunk=self.rspackChunk||[]).push([["js_growth-components_trial-cards_trial-comparison-card_index_ts-metaserver_static_js_campaign-e3b54d"],{21547(e,a,i){i.d(a,{Ay:()=>t});let t={cardContainer:"_card-container_i3etx_1",cardContainerModal:"_card-container-modal_i3etx_12",cardContainerBasic:"_card-container-basic_i3etx_17",cardContainerSubtleBackground:"_card-container-subtle-background_i3etx_22",cardContainerNoBorder:"_card-container-no-border_i3etx_26",cardContainerRecommended:"_card-container-recommended_i3etx_30",cardHeader:"_card-header_i3etx_34",cardFooter:"_card-footer_i3etx_39",cardFooterModal:"_card-footer-modal_i3etx_46",cardPreheadingContent:"_card-preheading-content_i3etx_51",cardHeading:"_card-heading_i3etx_56",separator:"_separator_i3etx_62",strikethroughPrice:"_strikethrough-price_i3etx_68",strikethroughAnnualBilling:"_strikethrough-annual-billing_i3etx_73",modalSeparator:"_modal-separator_i3etx_77",newBadge:"_new-badge_i3etx_82",headerInfoUl:"_header-info-ul_i3etx_91",headerInfoLi:"_header-info-li_i3etx_97",divider:"_divider_i3etx_107",featuresUl:"_features-ul_i3etx_114",featuresLi:"_features-li_i3etx_120",featuresLiIcon:"_features-li-icon_i3etx_126",featuresLiIconSubtle:"_features-li-icon-subtle_i3etx_134",addon:"_addon_i3etx_138",tooltipIcon:"_tooltip-icon_i3etx_144",addonCheckbox:"_addon-checkbox_i3etx_151",tooltipList:"_tooltip-list_i3etx_155",skipLink:"_skip-link_i3etx_160",skipLinkSmall:"_skip-link-small_i3etx_165",pricingSection:"_pricing-section_i3etx_170",annualBilling:"_annual-billing_i3etx_174",preheadingSpacer:"_preheading-spacer_i3etx_178",upsellCta:"_upsell-cta_i3etx_182",cardContainerSharingUpsell:"_card-container-sharing-upsell_i3etx_188"},r=`._card-container_i3etx_1 {
    display: flex;
    flex-direction: column;
    width: 296px;
    min-height: 339px;
    box-sizing: border-box;
    border: 1px solid var(--dig-color__border__base);
    background-color: var(--dig-color__background__base);
    padding: 24px;
}

._card-container-modal_i3etx_12 {
    /* Keep width consistent with comparisonCardModalWidth in comparison-card-style-modal.tsx */
    width: 375px;
}

._card-container-basic_i3etx_17 {
    width: 200px;
    border: 1px solid var(--dig-color__background__subtle);
}

._card-container-subtle-background_i3etx_22 {
    background-color: var(--dig-color__background__subtle);
}

._card-container-no-border_i3etx_26 {
    border: none;
}

._card-container-recommended_i3etx_30 {
    border: 1px solid var(--dig-color__secondary__base);
}

._card-header_i3etx_34 {
    display: flex;
    flex-direction: column;
}

._card-footer_i3etx_39 {
    display: flex;
    flex-direction: column;
    gap: var(--spacing__unit--2);
    margin-top: var(--spacing__unit--2);
}

._card-footer-modal_i3etx_46 {
    padding-top: var(--spacing__unit--2);
    margin-top: auto;
}

._card-preheading-content_i3etx_51 {
    display: flex;
    justify-content: space-between;
}

._card-heading_i3etx_56 {
    margin-bottom: var(--spacing__unit--1_5);
    display: flex;
    align-items: center;
}

._separator_i3etx_62 {
    flex-grow: 1;
    display: flex;
    align-items: flex-end;
}

._strikethrough-price_i3etx_68 {
    text-decoration: line-through;
    margin-right: var(--spacing__unit--0_5);
}

._strikethrough-annual-billing_i3etx_73 {
    text-decoration: line-through;
}

._modal-separator_i3etx_77 {
    margin-top: var(--spacing__unit--0_5);
    margin-bottom: var(--spacing__unit--1);
}

._new-badge_i3etx_82 {
    margin-left: 5px;
    padding: 6px var(--spacing__unit--1);
    background-color: var(--dig-color__primary__surface);
    color: var(--dig-color__primary__base);
    position: relative;
    top: -1px;
}

._header-info-ul_i3etx_91 {
    list-style-type: none;
    padding-inline-start: 0;
    margin: 0;
}

._header-info-li_i3etx_97 {
    display: flex;
    align-items: flex-start;
    padding-bottom: var(--spacing__unit--0_5);

    & svg {
        margin-right: var(--spacing__unit--1);
    }
}

._divider_i3etx_107 {
    width: 40px;
    margin: var(--spacing__unit--1) 0;
    height: 0;
    border: 0.5px solid var(--dig-color__border__base);
}

._features-ul_i3etx_114 {
    list-style-type: none;
    padding-inline-start: 0;
    margin: 0;
}

._features-li_i3etx_120 {
    display: flex;
    align-items: flex-start;
    padding-bottom: var(--spacing__unit--0_5);
}

._features-li-icon_i3etx_126 {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    color: var(--dig-color__primary__base);
    margin-right: var(--spacing__unit--1);
}

._features-li-icon-subtle_i3etx_134 {
    color: var(--dig-color__text__subtle);
}

._addon_i3etx_138 {
    display: flex;
    align-items: flex-start;
    margin-top: var(--spacing__unit--0_5);
}

._tooltip-icon_i3etx_144 {
    display: block;
    /* Need negative margin to properly align icon with adjacent text */
    margin-top: -1px;
    margin-left: var(--spacing__unit--0_5);
}

._addon-checkbox_i3etx_151 {
    margin-right: var(--spacing__unit--1);
}

._tooltip-list_i3etx_155 {
    margin: 0;
    padding-left: var(--spacing__unit--3);
}

._skip-link_i3etx_160 {
    /* Hard-coded to the height of the CTA button + spacing */
    margin-top: 56px;
}

._skip-link-small_i3etx_165 {
    /* Hard-coded to the height of the CTA button + spacing */
    margin-top: 44px;
}

._pricing-section_i3etx_170 {
    padding-bottom: var(--spacing__unit--1_5);
}

._annual-billing_i3etx_174 {
    height: 20px;
}

._preheading-spacer_i3etx_178 {
    height: 20px;
}

._upsell-cta_i3etx_182 {
    --dig-color__primary-cta__base: var(--dig-color__primary__base);
    --dig-color__primary-cta__base--state-1: var(--dig-color__primary__base--state-1);
    --dig-color__primary-cta__base--state-2: var(--dig-color__primary__base--state-2);
}

._card-container-sharing-upsell_i3etx_188 {
    width: 375px;
    border-radius: var(--dig-radius__medium);
    min-height: 0;
}

._card-container-sharing-upsell_i3etx_188 ._separator_i3etx_62 {
    margin-top: 8px;
    margin-bottom: 8px;
}

._card-container-sharing-upsell_i3etx_188 ._card-heading_i3etx_56 {
    margin-bottom: 6px;
}

._card-container-sharing-upsell_i3etx_188 ._pricing-section_i3etx_170 {
    padding-bottom: var(--spacing__unit--2);
}
`,n=document.createElement("style");n.textContent=r;let o="bazel-out/k8-opt/bin/js/growth-components/trial-cards/trial-comparison-card/trial-comparison-card.module.css";o&&n.setAttribute("path",o),window.dispatchEvent(new CustomEvent("elm:inject-css",{detail:n}))},89795(e,a,i){i.d(a,{Ay:()=>t});let t={cardContainer:"_card-container_ovosv_1",cardContainerHorizontalExpansion:"_card-container-horizontal-expansion_ovosv_12",cardContainerRecommendedHat:"_card-container-recommended-hat_ovosv_17",cardContainerRecommendedHatHorizontalExpansion:"_card-container-recommended-hat-horizontal-expansion_ovosv_32",cardContainerLessPaddingAndWider:"_card-container-less-padding-and-wider_ovosv_37",cardContainerLessPaddingAndWiderHorizontalExpansion:"_card-container-less-padding-and-wider-horizontal-expansion_ovosv_51",cardContainerNarrowFullHeight:"_card-container-narrow-full-height_ovosv_56",cardContainerNarrowFullHeightHorizontalExpansion:"_card-container-narrow-full-height-horizontal-expansion_ovosv_68",cardContainerOutlineMode:"_card-container-outline-mode_ovosv_74",cardContainerNightModeBackground:"_card-container-night-mode-background_ovosv_79",cardContainerRecommendedBlackHat:"_card-container-recommended-black-hat_ovosv_83",cardContentContainer:"_card-content-container_ovosv_87",cardContentLessBottomPadding:"_card-content-less-bottom-padding_ovosv_91",cardContentLessBottomPaddingHorizontalExpansion:"_card-content-less-bottom-padding-horizontal-expansion_ovosv_97",cardContainerFlex:"_card-container-flex_ovosv_101",recommendedPill:"_recommended-pill_ovosv_105",recommendedPillOwnRow:"_recommended-pill-own-row_ovosv_117",recommendedIcon:"_recommended-icon_ovosv_130",overflowTextBreak:"_overflow-text-break_ovosv_136",stretchToFillHeight:"_stretch-to-fill-height_ovosv_140",centerInFlexContainer:"_center-in-flex-container_ovosv_147",recommendedHat:"_recommended-hat_ovosv_154",recommendedBlackHat:"_recommended-black-hat_ovosv_166",recommendedHatHorizontalExpansion:"_recommended-hat-horizontal-expansion_ovosv_179",transparent:"_transparent_ovosv_183",transparentHat:"_transparent-hat_ovosv_187",recommendedBlackHatText:"_recommended-black-hat-text_ovosv_191",recommendedGreenText:"_recommended-green-text_ovosv_195",cardHeading:"_card-heading_ovosv_199",cardHeadingWithUserCount:"_card-heading-with-user-count_ovosv_203",cardHeadingMarginTopSmall:"_card-heading-margin-top-small_ovosv_207",cardSecondaryLink:"_card-secondary-link_ovosv_211",cardIconFeatureList:"_card-icon-feature-list_ovosv_215",cardIconFeatureListItem:"_card-icon-feature-list-item_ovosv_220",cardAddon:"_card-addon_ovosv_229",cardUserCount:"_card-user-count_ovosv_233",cardUserEyebrow:"_card-user-eyebrow_ovosv_237",eyebrowSubtle:"_eyebrow-subtle_ovosv_241",cardSubheading:"_card-subheading_ovosv_245",pricingSection:"_pricing-section_ovosv_250",pricingSectionMoreSpace:"_pricing-section-more-space_ovosv_254",subtitleWithExtraPadding:"_subtitle-with-extra-padding_ovosv_258",checkboxItem:"_checkbox-item_ovosv_262",tooltipIcon:"_tooltip-icon_ovosv_268",checkboxItemCheckbox:"_checkbox-item-checkbox_ovosv_275",primaryCtaButton:"_primary-cta-button_ovosv_279",primaryCtaButtonCompact:"_primary-cta-button-compact_ovosv_283",primaryCtaButtonHorizontalStretch:"_primary-cta-button-horizontal-stretch_ovosv_291",primaryCtaButtonHorizontalExpansion:"_primary-cta-button-horizontal-expansion_ovosv_295",bulletsContainerMarginTop:"_bullets-container-margin-top_ovosv_299",bulletsContainerMarginBottom:"_bullets-container-margin-bottom_ovosv_304",disclaimerContainer:"_disclaimer-container_ovosv_308"},r=`._card-container_ovosv_1 {
    box-sizing: border-box;
    max-width: var(--trial-card-max-width, 384px);
    min-width: 320px;
    background-color: var(--dig-color__background__subtle);
    border-radius: var(--spacing__unit--1_5);
    padding: var(--spacing__unit--1);
    align-items: end;
    height: 100%;
}

._card-container-horizontal-expansion_ovosv_12 {
    max-width: var(--trial-card-max-width, max-content);
    width: fit-content;
}

._card-container-recommended-hat_ovosv_17 {
    display: flex;
    flex: 1;
    box-sizing: border-box;
    max-width: var(--trial-card-max-width, 400px);
    min-width: 320px;
    width: 100%;
    background-color: var(--dig-color__background__subtle);
    border-bottom-left-radius: var(--dig-radius__large);
    border-bottom-right-radius: var(--dig-radius__large);
    padding: var(--dig-spacing__micro__small);
    padding-bottom: 0;
    padding-top: 0;
}

._card-container-recommended-hat-horizontal-expansion_ovosv_32 {
    max-width: var(--trial-card-max-width, max-content);
    width: fit-content;
}

._card-container-less-padding-and-wider_ovosv_37 {
    display: flex;
    box-sizing: border-box;
    max-width: var(--trial-card-max-width, 400px);
    min-width: 320px;
    width: 100%;
    background-color: var(--dig-color__background__subtle);
    border-radius: var(--dig-radius__large);
    padding: var(--dig-spacing__micro__small);
    padding-bottom: 0;
    overflow: break-word;
    align-items: end;
}

._card-container-less-padding-and-wider-horizontal-expansion_ovosv_51 {
    max-width: var(--trial-card-max-width, max-content);
    width: fit-content;
}

._card-container-narrow-full-height_ovosv_56 {
    width: 100%;
    height: 100%;
    max-width: var(--trial-card-max-width, 320px);
    min-width: initial;
    padding: var(--spacing__unit--1);
}

._card-container-narrow-full-height_ovosv_56 * {
    hyphens: none;
}

._card-container-narrow-full-height-horizontal-expansion_ovosv_68 {
    width: fit-content;
    max-width: var(--trial-card-max-width, max-content);
    min-width: 320px;
}

._card-container-outline-mode_ovosv_74 {
    background-color: var(--dig-color__background__base);
    border: 1px solid var(--dig-color__border__subtle);
}

._card-container-night-mode-background_ovosv_79 {
    background-color: var(--dig-color__primary-cta__on-base);
}

._card-container-recommended-black-hat_ovosv_83 {
    border: 1px solid var(--dig-color__primary-cta__base);
}

._card-content-container_ovosv_87 {
    padding: var(--spacing__unit--3);
}

._card-content-less-bottom-padding_ovosv_91 {
    padding: var(--dig-spacing__macro__small);
    width: 100%;
    padding-bottom: var(--dig-spacing__macro__xsmall);
}

._card-content-less-bottom-padding-horizontal-expansion_ovosv_97 {
    width: auto;
}

._card-container-flex_ovosv_101 {
    flex: 1 0 auto;
}

._recommended-pill_ovosv_105 {
    padding: 2px var(--spacing__unit--1) 1px var(--spacing__unit--0_5);
    justify-content: center;
    border-radius: var(--spacing__unit--5);
    background-color: var(--dig-color__accent__green);
    color: var(--dig-color__accent__on-accent);
    float: right;
    display: flex;
    flex-direction: row;
    align-items: center;
    max-width: 150px;
}
._recommended-pill-own-row_ovosv_117 {
    display: flex;
    justify-content: center;
    align-items: center;
    width: fit-content;
    margin-left: auto;
    margin-bottom: calc(var(--dig-spacing__micro__medium) * -1);
    padding: 0px var(--spacing__unit--1) 0px var(--spacing__unit--0_5);
    border-radius: var(--spacing__unit--5);
    background-color: var(--dig-color__accent__green);
    color: var(--dig-color__accent__on-accent);
}

._recommended-icon_ovosv_130 {
    margin-right: 2px;
    margin-top: 2px;
    margin-left: 2px;
    align-self: flex-start;
}
._overflow-text-break_ovosv_136 {
    overflow-wrap: anywhere;
}

._stretch-to-fill-height_ovosv_140 {
    display: flex;
    flex-direction: column;
    height: 100%;
    flex: 1;
}

._center-in-flex-container_ovosv_147 {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1 0 auto;
}

._recommended-hat_ovosv_154 {
    display: flex;
    box-sizing: border-box;
    max-width: var(--trial-card-max-width, 400px);
    min-width: 320px;
    background-color: var(--dig-color__identity__green);
    padding: 4px var(--dig-spacing__macro__medium);
    align-items: center;
    gap: var(--dig-spacing__micro__xsmall);
    border-radius: var(--dig-radius__xlarge) var(--dig-radius__xlarge) 0 0;
}

._recommended-black-hat_ovosv_166 {
    display: flex;
    box-sizing: border-box;
    max-width: var(--trial-card-max-width, 400px);
    min-width: 320px;
    background-color: var(--dig-color__primary-cta__base);
    color: var(--dig-color__secondary__on-base);
    padding: 4px var(--dig-spacing__macro__medium);
    align-items: center;
    gap: var(--dig-spacing__micro__xsmall);
    border-radius: var(--dig-radius__xlarge) var(--dig-radius__xlarge) 0 0;
}

._recommended-hat-horizontal-expansion_ovosv_179 {
    max-width: var(--trial-card-max-width, max-content);
}

._transparent_ovosv_183 {
    visibility: hidden;
}

._transparent-hat_ovosv_187 {
    visibility: none;
}

._recommended-black-hat-text_ovosv_191 {
    color: var(--dig-color__secondary__on-base);
}

._recommended-green-text_ovosv_195 {
    color: var(--dig-color__accent__on-accent);
}

._card-heading_ovosv_199 {
    margin-top: var(--spacing__unit--3);
    margin-bottom: var(--spacing__unit--4);
}
._card-heading-with-user-count_ovosv_203 {
    margin-bottom: var(--spacing__unit--1);
}

._card-heading-margin-top-small_ovosv_207 {
    margin-top: var(--spacing__unit--1);
}

._card-secondary-link_ovosv_211 {
    margin-top: var(--spacing__unit--2);
}

._card-icon-feature-list_ovosv_215 {
    list-style-type: none;
    padding: 0;
}

._card-icon-feature-list-item_ovosv_220 {
    padding-top: var(--spacing__unit--1_5);
    list-style-type: none;
}

._card-icon-feature-list-item_ovosv_220:first-child {
    padding-top: 0;
}

._card-addon_ovosv_229 {
    background-color: var(--dig-color__background__base);
    padding: var(--spacing__unit--2);
}
._card-user-count_ovosv_233 {
    margin-bottom: var(--spacing__unit--4);
}

._card-user-eyebrow_ovosv_237 {
    margin-bottom: var(--spacing__unit--3);
}

._eyebrow-subtle_ovosv_241 {
    color: var(--dig-color__text__subtle);
}

._card-subheading_ovosv_245 {
    margin-bottom: var(--spacing__unit--3);
    color: var(--dig-color__text__subtle);
}

._pricing-section_ovosv_250 {
    margin-bottom: var(--spacing__unit--3);
}

._pricing-section-more-space_ovosv_254 {
    margin-bottom: var(--spacing__unit--4);
}

._subtitle-with-extra-padding_ovosv_258 {
    padding-bottom: var(--dig-spacing__macro__small);
}

._checkbox-item_ovosv_262 {
    display: flex;
    align-items: flex-start;
    margin-top: var(--spacing__unit--0_5);
}

._tooltip-icon_ovosv_268 {
    display: block;
    /* Need negative margin to properly align icon with adjacent text */
    margin-top: -1px;
    margin-left: var(--spacing__unit--0_5);
}

._checkbox-item-checkbox_ovosv_275 {
    margin-right: var(--spacing__unit--1);
}

._primary-cta-button_ovosv_279 {
    min-width: 272px;
}

._primary-cta-button-compact_ovosv_283 {
    height: auto;
    min-width: 0;
    min-height: var(--dig-spacing__macro__medium);
    white-space: normal;
    overflow-wrap: break-word;
}

._primary-cta-button-horizontal-stretch_ovosv_291 {
    width: stretch;
}

._primary-cta-button-horizontal-expansion_ovosv_295 {
    width: max-content;
}

._bullets-container-margin-top_ovosv_299 {
    /* mimics previous behavior of hardcoded 22px margin + item margin */
    margin-top: calc(var(--spacing__unit--1_5) + 22px);
}

._bullets-container-margin-bottom_ovosv_304 {
    margin-bottom: var(--dig-spacing__macro__small);
}

._disclaimer-container_ovosv_308 {
    display: flex;
    align-items: center;
    gap: var(--dig-spacing__micro__xsmall);
    margin-top: var(--dig-spacing__macro__xsmall);
    justify-content: center;
}
`,n=document.createElement("style");n.textContent=r;let o="bazel-out/k8-opt/bin/js/growth-components/trial-cards/trial-plan-card/trial-plan-card.module.css";o&&n.setAttribute("path",o),window.dispatchEvent(new CustomEvent("elm:inject-css",{detail:n}))},6175(e,a,i){i.d(a,{B:()=>s,i:()=>o});var t=i(8641),r=i(83461);let n=(0,r.createContext)({heights:{},setHeights:()=>void 0}),o=({children:e})=>{let[a,i]=(0,r.useState)({}),o=(0,r.useMemo)(()=>({heights:a,setHeights:i}),[a,i]);return(0,t.jsx)(n.Provider,{value:o,children:e})},s=e=>{let{heights:a,setHeights:i}=(0,r.useContext)(n);return{props:{ref:a=>{let t=a?.getBoundingClientRect().height||0;i(a=>{if(t>(a[e]||0))return{...a,[e]:t};return a})},style:{minHeight:a[e]}},height:a[e]}}},84640(e,a,i){i.d(a,{W:()=>t,C:()=>r});let t=(0,i(83461).createContext)({logEvent:()=>{console.error("PapLoggingContext provider is missing")}}),{Provider:r}=t},96512(e,a,i){i.d(a,{M:()=>t.M});var t=i(80015)},80015(e,a,i){i.d(a,{M:()=>r}),i(82136),i(95350);var t=i(8641);i(83461);let r=({text:e})=>{let a=e.split(/(<b>|<\/b>)/),i=!1,r=a.map((e,a)=>{if("<b>"===e)return i=!0,null;if("</b>"===e)return i=!1,null;if(i)return(0,t.jsx)("b",{children:e},a);return e});return(0,t.jsx)("span",{children:r})}},58505(e,a,i){i.d(a,{c:()=>M});var t=i(8641);i(83461);var r=i(4919),n=i(53409),o=i(21090),s=i.n(o);let _=`._green-price-text_1i6de_1 {
    color: var(--dig-color__success__base);
}

._muted-price-text_1i6de_5 {
    color: var(--dig-color__text__subtle);
}
`,d=document.createElement("style");d.textContent=_;let c="bazel-out/k8-opt/bin/js/growth-components/pricing-section/index.module.css";c&&d.setAttribute("path",c),window.dispatchEvent(new CustomEvent("elm:inject-css",{detail:d}));var l=i(35298);let g=(0,l.zR)({id:"+ubGeK",defaultMessage:"*Compared to purchasing these features separately"}),m=(0,l.zR)({id:"5EMYuJ",defaultMessage:"<b>Free</b>"}),p=(0,l.zR)({id:"Z4B87G",defaultMessage:"<b><s>{comparison_monthly_price}*</s> <span>{monthly_price}</span> / month</b>"}),u=(0,l.zR)({id:"6Is7cj",defaultMessage:"Save {saving_percentage} when billed annually"}),h=(0,l.zR)({id:"Gk+yej",defaultMessage:", billed yearly"}),v=(0,l.zR)({id:"HrGqiY",defaultMessage:"<b>{tax_included}</b>"}),x=(0,l.zR)({id:"uFOBDC",defaultMessage:"<b>({tax_included})</b>"}),b=(0,l.zR)({id:"YbtiCB",defaultMessage:"<b><span>{monthly_price}</span> / month</b>"}),f=(0,l.zR)({id:"rb8MHC",defaultMessage:"(billed yearly)"}),y=(0,l.zR)({id:"Dt6aqO",defaultMessage:"<b><s>{monthly_price}</s> <span>{yearly_price_billed_monthly}</span> / month</b>"}),E=(0,l.zR)({id:"KvQOku",defaultMessage:"<b><span>{monthly_price}</span> / user / month</b>"}),k=(0,l.zR)({id:"lQ6dnL",defaultMessage:"<b><s>{monthly_price}</s> <span>{yearly_price_billed_monthly}</span> / user / month</b>"}),A=(0,l.zR)({id:"XSGNnT",defaultMessage:"<b><s>{strikethrough_yearly_price}</s> <span>{yearly_price}</span> / year</b>"});var C=i(79805),w=i(85159);let M=({planSelectorName:e,annualBillingByMonth:a,monthlyBillingByMonth:i,advertisedYearlyPriceSavingsPercentage:o,countryCode:_,includedTaxString:d,priceTextSize:c="medium",discountTextSize:l="medium",annualBillingByMonthPerLicense:M,monthlyBillingByMonthPerLicense:j,strikethroughAnnualBillingByMonth:S,strikethroughMonthlyBillingByMonth:N,annualBillingByYear:T,strikethroughAnnualBillingByYear:O,showStrikethroughPricing:R,styleVariant:I="green",monthlyBilling:B=!1,taxMessageInline:z=!1,suffixTextSize:L,isMutedStyling:P=!1,isPriceBold:D=!0,hideBilledYearlySuffix:U=!1})=>{let{pricingMessage:H,taxMessage:F,comparisonDisclaimerText:Y,yearlyDiscountMessage:G}=(({intl:e,planSelectorName:a,annualBillingByMonth:i,monthlyBillingByMonth:r,advertisedYearlyPriceSavingsPercentage:o,countryCode:_,includedTaxString:d,priceTextSize:c,discountTextSize:l,annualBillingByMonthPerLicense:w,monthlyBillingByMonthPerLicense:M,strikethroughAnnualBillingByMonth:j,strikethroughMonthlyBillingByMonth:S,annualBillingByYear:N,strikethroughAnnualBillingByYear:T,showStrikethroughPricing:O=!0,monthlyBilling:R=!1,styleVariant:I="green",taxMessageInline:B=!1,suffixTextSize:z,isMutedStyling:L=!1,isPriceBold:P=!0,hideBilledYearlySuffix:D=!1})=>{let U=null,H=null,F=null,Y=null,G="green"===I,q="black"===I,W="parenthesesAroundBilledYearly"===I,V=[C.Jz.businessStandard,C.Jz.businessStandardDocsendAdvanced,C.Jz.businessStandardMin1TieredStorage,C.Jz.businessAdvanced,C.Jz.dropboxBusiness,C.Jz.dropboxBusinessPlus].includes(a)&&void 0!==M&&!!M&&void 0!==w&&!!w,K=a===C.Jz.professionalEsign&&void 0!==j&&!!j&&void 0!==S&&!!S,X={size:void 0!==z?z:c,isBold:G,color:G||q?"standard":"subtle"},$={size:c,isBold:P,className:s()({"_green-price-text_1i6de_1":G,"_muted-price-text_1i6de_5":L&&!G})},Q="AU"===_&&!!N&&!!T,J="AU"===_&&!Q||R;if(a===C.Jz.basic)return{pricingMessage:U=(0,t.jsx)(n.EY,{size:c,children:e.formatMessage(m,{b:e=>(0,t.jsx)("strong",{children:e})})}),taxMessage:H,comparisonDisclaimerText:Y,yearlyDiscountMessage:F};return J||D||Q||(F=(0,t.jsx)(n.EY,{size:G?l:q?z:c,color:q?"standard":"subtle",children:G?e.formatMessage(u,{saving_percentage:o}):q||W?e.formatMessage(f):e.formatMessage(h)})),d&&(H=q?(0,t.jsx)(n.EY,{size:c,children:e.formatMessage(x,{tax_included:d,b:e=>(0,t.jsx)(n.EY,{...X,children:e})})}):(0,t.jsx)(n.EY,{size:c,children:e.formatMessage(v,{tax_included:d,b:e=>(0,t.jsx)(n.EY,{...X,children:e})})})),U=Q&&O?(0,t.jsx)(n.EY,{size:c,children:e.formatMessage(A,{strikethrough_yearly_price:T,yearly_price:N,b:e=>(0,t.jsx)(n.EY,{...X,children:e}),s:e=>(0,t.jsx)("s",{children:e}),span:e=>(0,t.jsx)(n.EY,{...$,children:e})})}):!J&&O?V?(0,t.jsx)(n.EY,{size:c,children:e.formatMessage(k,{monthly_price:M,yearly_price_billed_monthly:w,b:e=>(0,t.jsx)(n.EY,{...X,children:e}),s:e=>(0,t.jsx)("s",{children:e}),span:e=>(0,t.jsx)(n.EY,{...$,children:e})})}):K?(0,t.jsx)(n.EY,{size:c,children:e.formatMessage(p,{monthly_price:i,comparison_monthly_price:j,b:e=>(0,t.jsx)(n.EY,{...X,children:e}),s:e=>(0,t.jsx)("s",{children:e}),span:e=>(0,t.jsx)(n.EY,{...$,children:e})})}):(0,t.jsx)(n.EY,{size:c,children:e.formatMessage(y,{monthly_price:r,yearly_price_billed_monthly:i,b:e=>(0,t.jsx)(n.EY,{...X,children:e}),s:e=>(0,t.jsx)("s",{children:e}),span:e=>(0,t.jsx)(n.EY,{...$,children:e})})}):V?(0,t.jsx)(n.EY,{size:c,children:e.formatMessage(E,{monthly_price:J?M:w,b:e=>(0,t.jsx)(n.EY,{...X,children:e}),span:e=>(0,t.jsx)(n.EY,{...$,children:e})})}):K?(0,t.jsx)(n.EY,{size:c,children:e.formatMessage(p,{monthly_price:J?r:i,comparison_monthly_price:S,b:e=>(0,t.jsx)("strong",{children:e})})}):(0,t.jsx)(n.EY,{size:c,children:e.formatMessage(b,{monthly_price:J?r:i,b:e=>(0,t.jsx)(n.EY,{...X,children:e}),span:e=>(0,t.jsx)(n.EY,{...$,children:e})})}),K&&(Y=(0,t.jsx)(n.EY,{size:l,color:"subtle",children:e.formatMessage(g)})),!G&&F&&(U=q||W?(0,t.jsxs)("div",{children:[U," ",F]}):(0,t.jsxs)("div",{children:[U,F]}),F=null),B&&(U=(0,t.jsxs)("div",{children:[U," ",B?H:null]})),{pricingMessage:U,taxMessage:H,comparisonDisclaimerText:Y,yearlyDiscountMessage:F}})({intl:(0,r.A)(),planSelectorName:e,annualBillingByMonth:a,monthlyBillingByMonth:i,advertisedYearlyPriceSavingsPercentage:o,countryCode:_,includedTaxString:d,priceTextSize:c,discountTextSize:l,annualBillingByMonthPerLicense:M,monthlyBillingByMonthPerLicense:j,strikethroughAnnualBillingByMonth:S,strikethroughMonthlyBillingByMonth:N,annualBillingByYear:T,strikethroughAnnualBillingByYear:O,showStrikethroughPricing:R,monthlyBilling:B,styleVariant:I,taxMessageInline:z,suffixTextSize:L,isMutedStyling:P,isPriceBold:D,hideBilledYearlySuffix:U});return(0,t.jsxs)(w.a,{"data-testid":"pricing-section",children:[(0,t.jsx)(w.a,{"data-testid":"pricing-message",marginBottom:"Micro XSmall",children:H}),null!=F&&!z&&(0,t.jsx)(w.a,{"data-testid":"tax-message",children:F}),null!=Y&&(0,t.jsx)(w.a,{"data-testid":"comparison-disclaimer-text",children:Y}),null!=G&&(0,t.jsx)(w.a,{"data-testid":"yearly-discount-message",children:G})]})}},53957(e,a,i){i.d(a,{$:()=>l}),i(82136),i(95350);var t=i(8641),r=i(74172),n=i(53409),o=i(98305),s=i(50577);i(83461);var _=i(64388),d=i(26918),c=i(21547);let l=({id:e,isAddonSelected:a,setAddonSelected:i,addon:l})=>(0,t.jsx)("div",{className:c.Ay.addon,children:(0,t.jsxs)(d.H,{id:e,isChecked:a,onChange:e=>{i(e)},children:[(0,t.jsx)(n.EY,{tagName:"label",htmlFor:e,isBold:!0,children:(0,t.jsx)(_.A,{...l.messages?.label})}),(l.messages?.tooltipText||l.messages?.tooltipList)&&(0,t.jsx)(r.m_,{placement:"bottom",maxWidth:384,title:(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("div",{children:l.messages.tooltipText&&(0,t.jsx)(_.A,{...l.messages.tooltipText})}),(0,t.jsx)("ul",{className:c.Ay.tooltipList,children:l.messages.tooltipList?.map((e,a)=>(0,t.jsx)("li",{children:(0,t.jsx)(_.A,{...e})},a))})]}),children:(0,t.jsx)("div",{"data-testid":"addon-tooltip",tabIndex:0,children:(0,t.jsx)(o.Sd,{className:c.Ay.tooltipIcon,src:s.d})})})]})})},26918(e,a,i){i.d(a,{H:()=>o});var t=i(8641),r=i(7086);i(83461);var n=i(89795);let o=({id:e,isChecked:a,onChange:i,children:o})=>(0,t.jsxs)("div",{className:n.Ay.checkboxItem,children:[(0,t.jsx)(r.Sc,{id:e,className:n.Ay.checkboxItemCheckbox,checked:a,onChange:e=>{i(e.currentTarget.checked)},"data-uxa-log":`${e}--is${a?"":"-not"}-checked`}),o]})},21984(e,a,i){i.d(a,{Cm:()=>W.Cm,BB:()=>W.BB,nH:()=>W.nH,W0:()=>K}),i(82136),i(95350);var t=i(8641),r=i(8765),n=i(23567),o=i(53409),s=i(85159),_=i(21090),d=i.n(_),c=i(83461),l=i(4919),g=i(35298),m=i(64388),p=i(98305),u=i(78148);let h="_feature-list-text_lq4mm_14",v=`._feature-list_lq4mm_1 {
    padding: unset;
    margin-bottom: 0px;
    margin-top: 0px;
}

._feature-list-item_lq4mm_7 {
    list-style: none;
    padding: 0;
    display: flex;
    margin-bottom: var(--spacing__unit--1);
}

._feature-list-text_lq4mm_14 {
    margin-left: var(--spacing__unit--0_5);
}

._feature-list-item-icon_lq4mm_18 {
    min-width: var(--spacing__unit--3);
    color: var(--dig-color__primary__base);
    margin-top: calc(-1 * var(--spacing__unit--0_5));
    margin-bottom: calc(-1 * var(--spacing__unit--0_5));
    align-self: center;
}

._feature-list-item-icon-div_lq4mm_26 {
    display: flex;
    align-items: center;
    height: fit-content;
}
`,x=document.createElement("style");x.textContent=v;let b="bazel-out/k8-opt/bin/js/growth-components/feature-list/index.module.css";b&&x.setAttribute("path",b),window.dispatchEvent(new CustomEvent("elm:inject-css",{detail:x}));var f=i(96512);let y=({features:e,textSize:a="medium"})=>(0,t.jsx)("ul",{className:"_feature-list_lq4mm_1",children:e.map((e,i)=>(0,t.jsxs)("li",{className:"_feature-list-item_lq4mm_7",children:[(0,t.jsxs)("div",{className:"_feature-list-item-icon-div_lq4mm_26",children:[(0,t.jsx)(p.Sd,{className:"_feature-list-item-icon_lq4mm_18",src:u.i}),(0,t.jsx)(o.EY,{size:a,className:h,children:"​"})]}),(0,t.jsx)(o.EY,{size:a,className:h,children:(0,t.jsx)(f.M,{text:e})})]},i))}),E=`._card_k2a6k_1 {
    border: 1px solid var(--dig-color__border__base);
    height: 100%;
    background-color: var(--dig-color__background__base);
}

._card_k2a6k_1 svg {
    visibility: visible;
    /* for visibility in Prompt preview */
}

._recommendation-banner_k2a6k_12 {
    height: var(--spacing__unit--4);
    background-color: var(--dig-color__background__base);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    color: var(--dig-color__text__base);
}

._recommendation-banner-icon_k2a6k_22 {
    margin-right: var(--spacing__unit--1);
    display: flex;
    margin-top: calc(-1 * var(--spacing__unit--1));
    margin-bottom: calc(-1 * var(--spacing__unit--1));
}

._recommendation-banner-text_k2a6k_29 {
    color: var(--dig-color__text__base);
}

._banner-spacer_k2a6k_33 {
    height: var(--spacing__unit--4);
    width: 100%;
}

._card-body_k2a6k_38 {
    padding: var(--spacing__unit--3);
}

._basic-card-title-row_k2a6k_42 {
    display: flex;
    justify-content: space-between;
}

._price-text-div_k2a6k_47 {
    margin-bottom: var(--spacing__unit--0_5);
}

._new-badge_k2a6k_51 {
    margin-left: 5px;
    padding: 6px var(--spacing__unit--1);
    background-color: #0061fe14;
    color: var(--dig-color__primary__base);
    position: relative;
    top: -1px;
}

._plan-name_k2a6k_60 {
    display: inline-block;
    margin-top: var(--spacing__unit--1);
    margin-bottom: var(--spacing__unit--0_5);
}

._plan-space_k2a6k_66 {
    margin-top: 0px;
    margin-bottom: var(--spacing__unit--0_5);
}

._secondary-plan-checkbox-row_k2a6k_71 {
    display: flex;
    align-items: center;
    margin-bottom: var(--spacing__unit--1);
}

._secondary-plan-checkbox_k2a6k_71 {
    margin-right: var(--spacing__unit--1);
}

._secondary-plan-info-icon_k2a6k_81 {
    display: flex;
}

._separator_k2a6k_85 {
    margin-top: var(--spacing__unit--2);
    width: 48px;
    height: 1px;
    background-color: var(--dig-color__border__subtle);
}

._feature-list_k2a6k_92 {
    margin-bottom: var(--spacing__unit--1);
    margin-top: var(--spacing__unit--1_5);
}

._pricingCtaSpacer_k2a6k_97 {
    height: var(--spacing__unit--2_5);
}

._cta_k2a6k_101 {
    margin-top: var(--spacing__unit--1_5);
    margin-bottom: var(--spacing__unit--2);
}

._info-section_k2a6k_106 {
    padding-top: var(--spacing__unit--1);
}

._info-row_k2a6k_110 {
    display: flex;
    margin-bottom: var(--spacing__unit--1);
}

._info-row-icon-div_k2a6k_115 {
    display: flex;
    align-items: center;
    height: fit-content;
}

._info-row-icon_k2a6k_115 {
    min-width: var(--spacing__unit--3);
    margin: calc(-1 * var(--spacing__unit--0_5)) var(--spacing__unit--1)
        calc(-1 * var(--spacing__unit--0_5)) 0;
    align-self: center;
}

._prompt-upsell-cta_k2a6k_128 {
    --dig-color__primary-cta__base: var(--dig-color__primary__base);
    --dig-color__primary-cta__base--state-1: var(--dig-color__primary__base--state-1);
}
`,k=document.createElement("style");k.textContent=E;let A="bazel-out/k8-opt/bin/js/growth-components/paid-plan-card/index.module.css";A&&k.setAttribute("path",A),window.dispatchEvent(new CustomEvent("elm:inject-css",{detail:k})),i(7086),i(74172),(0,g.zR)({id:"ISCP0V",defaultMessage:"<b>{storage_multiplier}x</b> more storage than Basic"}),(0,g.zR)({id:"nT2p0G",defaultMessage:"As much space as needed, once purchased"}),(0,g.zR)({id:"kCbreO",defaultMessage:"Starts at {space} shared by the team"}),(0,g.zR)({id:"HItkTm",defaultMessage:"Others like you also purchased"}),(0,g.zR)({id:"cXTc+G",defaultMessage:"Info icon"}),(0,g.zR)({id:"f40ndK",defaultMessage:"For individuals"}),(0,g.zR)({id:"u0NLTa",defaultMessage:"For friends & family"}),(0,g.zR)({id:"vzmTJO",defaultMessage:"For freelancers"}),(0,g.zR)({id:"WLmiM4",defaultMessage:"For teams"});let C=(0,g.zR)({id:"c8nbXb",defaultMessage:"NEW"});(0,g.zR)({id:"IQBNDF",defaultMessage:"Upgrade now"}),(0,g.zR)({id:"h9Bisq",defaultMessage:"Try free for {trial_duration, plural, one {# day} other {# days}}"}),i(58505);var w=i(62685),M=i(84640),j=i(53957),S=i(6175);let N=({children:e})=>{let{props:a}=(0,S.B)("trial-comparison-card-body");return(0,t.jsx)("div",{...a,children:e})};var T=i(83806),O=i(21547),R=i(17235);let I=({isModal:e,children:a})=>(0,t.jsx)("div",{className:e?O.Ay.cardFooterModal:O.Ay.cardFooter,children:a}),B=({children:e})=>(0,t.jsx)("div",{children:e}),z=({trialHref:e,trialCtaText:a,trialDuration:i,selectedAddon:r,recommended:o,trialUxaLog:s,isModal:_,isUpsellCta:d,confirmHandler:m})=>{let p=(0,l.A)().formatMessage((0,g.zR)({id:"p5OhNM",defaultMessage:"Try free for {duration}"}),{duration:i}),[u,h]=c.useState("top"),v="outline";o?v="primary":_&&(v="opacity");let x="primary"===v;return(0,t.jsx)(n.$n,{className:x&&d?O.Ay.upsellCta:"",variant:v,size:p.length>20?"small":"large",href:(0,w.hZ)((0,R.a)(e,r)),"data-uxa-log":s,"data-trackingid":"trial-first-start-trial-link",onClick:a=>{m&&m(a,(0,R.a)(e,r))},children:(0,t.jsxs)(T.P,{maxWidth:240,tooltipControlProps:{auto:!0,placement:u,onChangePlacement:e=>h(e)},children:[a&&a,!a&&p]})})},L=({skipHref:e})=>{let a=(0,l.A)(),i=a.formatMessage((0,g.zR)({id:"LCBtEN",defaultMessage:"Continue with Basic"})),r=i.length>22,o=a.formatMessage((0,g.zR)({id:"p5OhNM",defaultMessage:"Try free for {duration}"}),{duration:""}).length>13,[s,_]=c.useState("top");return(0,t.jsx)(n.$n,{className:o?O.Ay.skipLinkSmall:O.Ay.skipLink,size:r?"small":"standard",variant:"transparent",href:(0,w.hZ)(e),"data-trackingid":"trial-first-skip-trial-link","data-uxa-log":"trial-cta-basic",children:(0,t.jsx)(T.P,{maxWidth:170,tooltipControlProps:{auto:!0,placement:s,onChangePlacement:e=>_(e)},children:i})})},P=({purchaseHref:e,selectedAddon:a,purchaseUxaLog:i})=>{let r=(0,l.A)(),[o,s]=c.useState("top");return(0,t.jsx)(n.$n,{variant:"transparent",href:(0,w.hZ)((0,R.a)(e,a)),"data-uxa-log":i,"data-trackingid":"trial-first-purchase-link",children:(0,t.jsx)(T.P,{maxWidth:240,tooltipControlProps:{auto:!0,placement:o,onChangePlacement:e=>s(e)},children:r.formatMessage((0,g.zR)({id:"NKa9C5",defaultMessage:"or purchase now"}))})})},D=({children:e})=>{let{props:a}=(0,S.B)("trial-comparison-card-header");return(0,t.jsx)("div",{className:O.Ay.cardHeader,...a,children:e})},U=({badge:e,children:a})=>(0,t.jsxs)("div",{className:O.Ay.cardPreheadingContent,children:[a&&(0,t.jsx)("div",{children:a}),e&&(0,t.jsx)("div",{children:e})]}),H=({children:e})=>(0,t.jsx)(o.hE,{className:O.Ay.cardHeading,children:e}),F=({children:e})=>(0,t.jsx)("ul",{className:O.Ay.headerInfoUl,children:e}),Y=({icon:e,children:a})=>(0,t.jsxs)("li",{className:O.Ay.headerInfoLi,children:[(0,t.jsx)(p.Sd,{src:e}),(0,t.jsx)(o.EY,{children:a})]}),G=()=>(0,t.jsx)("div",{className:O.Ay.divider}),q=({recommended:e,basic:a,borderStyle:i,backgroundColor:r,isModal:n,customCardContainerClass:o,children:s,..._})=>(0,t.jsx)("div",{className:d()(O.Ay.cardContainer,{[O.Ay.cardContainerRecommended]:e,[O.Ay.cardContainerBasic]:a,[O.Ay.cardContainerSubtleBackground]:"subtle"===r,[O.Ay.cardContainerNoBorder]:"none"===i,[O.Ay.cardContainerModal]:n},o),"data-testid":"card-container",..._,children:s});var W=i(43838),V=i(15312);let K=({heading:e,bullets:a,trialDuration:i,productFamily:_,trialCtaText:p,skipHref:u,trialHref:h,purchaseHref:v,trialCardsLocation:x,primaryPurchaseType:b,addon:f,variant:E,headerInfo:k,formattedPriceString:A,priceStringColor:w,formattedStrikethroughPriceString:S,useAnnualPricing:T,strikethroughAnnualPricing:K,borderStyle:X,backgroundColor:$,surface:Q,newBadge:J,isBasic:Z,isUpsellCta:ee,preheading:ea,customCardContainerClass:ei,confirmHandler:et,isPreheadingBold:er=!0,showFooter:en=!0,...eo})=>{let{logEvent:es}=(0,c.useContext)(M.W),[e_,ed]=(0,c.useState)(!1),ec=E===W.BB.CURRENT,el=Q===W.Cm.MODAL,eg=E===W.BB.RECOMMENDED,em=ec&&el,ep=!!(h&&(i||p)),eu=(0,l.A)(),eh=eu.formatMessage((0,g.zR)({id:"UAyOLO",defaultMessage:"Your current plan"})),ev=eu.formatMessage((0,g.zR)({id:"0ubeNE",defaultMessage:"Current Plan"})),ex=em?eh:ea;(0,c.useEffect)(()=>{es((0,V.s)({sku:_,recommended:eg,trial:!ec})),f?.includeByDefault&&ed(!0)},[]);let eb=null;return eg&&(eb=(0,t.jsx)(r.E,{tone:"attention",children:(0,t.jsx)(m.A,{id:"GPDghz",defaultMessage:"Recommended"})})),(0,t.jsxs)(q,{recommended:!el&&eg,basic:ec&&!el,borderStyle:X,backgroundColor:$,isModal:el,customCardContainerClass:ei,...eo,children:[(0,t.jsxs)(D,{children:[(0,t.jsxs)(U,{badge:eb,children:[ex&&(0,t.jsx)(o.EY,{size:"small",variant:"label",color:em?"faint":"standard",isBold:er,children:ex}),!ex&&(0,t.jsx)("div",{className:O.Ay.preheadingSpacer})]}),(0,t.jsxs)(H,{children:[e,J&&(0,t.jsx)(o.EY,{className:O.Ay.newBadge,size:"xsmall",isBold:!0,children:eu.formatMessage(C)})]}),!!A&&(0,t.jsxs)("div",{className:O.Ay.pricingSection,children:[S&&(0,t.jsx)(o.EY,{className:O.Ay.strikethroughPrice,color:"faint",variant:"paragraph",size:"medium",isBold:!0,children:S}),(0,t.jsx)(s.a,{color:w??"Text Base",tagName:"span",children:(0,t.jsx)(o.EY,{variant:"paragraph",size:"medium",isBold:!0,color:"inherit","data-testid":"comparison-card-"+_+"-pricing",children:A})}),(0,t.jsx)("br",{}),T&&Z&&(0,t.jsx)("div",{className:O.Ay.annualBilling}),T&&!Z&&(0,t.jsx)(o.EY,{className:d()({[O.Ay.strikethroughAnnualBilling]:K}),variant:"paragraph",size:"xsmall",color:K?"faint":"standard",children:(0,t.jsx)(m.A,{id:"VWijQZ",defaultMessage:"when billed annually"})})]}),k&&(0,t.jsx)("div",{children:(0,t.jsx)(F,{children:k.map(({icon:e,text:a},i)=>(0,t.jsx)(Y,{icon:e,children:a},i))})}),(0,t.jsx)("div",{className:d()(O.Ay.separator,{[O.Ay.modalSeparator]:el}),children:(0,t.jsx)(G,{})})]}),(0,t.jsxs)(N,{children:[(0,t.jsx)(y,{textSize:"small",features:a}),f&&(0,t.jsx)(j.$,{id:`${_}__${f.name}--checkbox`,isAddonSelected:e_,setAddonSelected:ed,addon:f})]}),en&&(0,t.jsxs)(I,{isModal:el&&(em||ep),children:[em&&(0,t.jsx)(B,{children:(0,t.jsx)(n.$n,{size:"large",variant:"opacity",disabled:!0,children:(0,t.jsx)(o.EY,{color:"disabled",isBold:!0,children:ev})})}),!em&&ep&&(0,t.jsx)(B,{children:(0,t.jsx)(z,{trialHref:h,selectedAddon:e_&&f?f.name:null,trialCtaText:p,trialDuration:i,recommended:eg,trialUxaLog:(0,R.v)({selectedAddon:e_&&f?f.name:null,trialCardsLocation:x,productFamily:_,purchaseType:b,isPurchase:!1,isRecommended:eg}),isModal:el,isUpsellCta:ee,confirmHandler:et})}),(0,t.jsxs)(B,{children:[!em&&u&&(0,t.jsx)(L,{skipHref:u}),v&&(0,t.jsx)(P,{purchaseHref:v,selectedAddon:e_&&f?f.name:null,purchaseUxaLog:(0,R.v)({selectedAddon:e_&&f?f.name:null,trialCardsLocation:x,productFamily:_,purchaseType:b,isPurchase:!0,isRecommended:eg})})]})]})]})}},43838(e,a,i){i.d(a,{BB:()=>s,Cm:()=>_,nH:()=>o});var t,r,n,o=((t={}).TRIAL_FIRST="trial_first",t.SPACE_UPGRADE="space_upgrade",t.CANCEL_CROSS_SELL="cancel_cross_sell",t.PRODUCTS_PAGE="products_page",t.PROMPT_MODAL="prompt_modal",t.OUT_OF_SPACE_PROMPT_MODAL="out_of_space_prompt_modal",t.OUT_OF_SPACE_MODAL_ACCOUNT_MENU="out_of_space_modal_account_menu",t.OUT_OF_SPACE_MODAL_LEFT_NAV="out_of_space_modal_left_nav",t.PDF_EDIT="pdf_edit",t.FP_TAKEOVER_OVERQUOTA_MODAL="fp_takeover_overquota_modal",t.OVERQUOTA_SHARE_BANNER="overquota_share_banner",t.OVERQUOTA_RESTRICTIONS_MODAL="overquota_restrictions_modal",t.BLOCK_PENDING_OQ_UPLOAD_MODAL="block_pending_oq_upload_modal",t.TOKEN_UPGRADE="token_upgrade",t),s=((r={}).CURRENT="current",r.RECOMMENDED="recommended",r),_=((n={}).PAGE_CONTENT="PAGE_CONTENT",n.MODAL="modal",n)},17235(e,a,i){i.d(a,{a:()=>t,v:()=>r});let t=(e,a)=>{let i=e;return"dropbox_one"===a&&(i=i.replace("pro/try","one/try").replace("buy/professional","buy/one")),i},r=({selectedAddon:e,trialCardsLocation:a,productFamily:i,purchaseType:t,isPurchase:r=!1,isRecommended:n=!1,shouldOpenModal:o=!1,isMobile:s=!1})=>{let _=r?`trial-purchase-cta-${i}`:`trial-cta-${i}`;return a&&(_+=`-${a}`),"pro_esign"===e&&(_+="-with-addon-pro-esign"),"dropbox_one"===e&&(_+="-with-dropbox_one"),"essentials"===e&&(_+="-with-essentials"),t&&(_+=`-${t}`),o&&(_+="-with-modal"),n&&(_+="-recommended"),s&&(_+="-on-mobile"),_}},79805(e,a,i){i.d(a,{Jz:()=>n,Xy:()=>s,u:()=>o});var t,r,n=((t={}).basic="basic",t.basicPlus500GB="basicPlus500GB",t.plus="plus",t.family="family",t.professional="professional",t.professionalEsign="professionalEsign",t.businessAdvanced="businessAdvanced",t.businessStandard="businessStandard",t.businessStandardMin1TieredStorage="businessStandardMin1TieredStorage",t.businessStandardDocsendAdvanced="businessStandardDocsendAdvanced",t.dropboxBusiness="business",t.dropboxBusinessPlus="businessPlus",t),o=((r={}).DEFAULT="DEFAULT",r.ROUNDED_2024_REDESIGN="ROUNDED_2024_REDESIGN",r.MULTIPRODUCT="MULTIPRODUCT",r.LAP="LAP",r.OPTIMIZE_MOBILE_WEB_CHECKOUT="OPTIMIZE_MOBILE_WEB_CHECKOUT",r);let s={INDIVIDUAL:"basic",BASIC500:"basicPlus500GB",PLUS:"plus",FAMILY:"family",PROFESSIONAL:"professional",PROFESSIONALESIGN:"professionalEsign",ADVANCED:"businessAdvanced",STANDARD:"businessStandard",STANDARDMIN1TIEREDSTORAGE:"businessStandardMin1TieredStorage",DBXBUSINESS:"business",DBXBUSINESSPLUS:"businessPlus"}},15312(e,a,i){i.d(a,{s:()=>t});function t(e){return{class:"display",action:"shown",object:"plan_card",properties:e}}},80376(e,a,i){i.d(a,{$:()=>n,h:()=>o});var t=i(92629),r=i(16183);function n(e,a,i,r,n){if(!e)return;let o=t.r.parse(e);return null==a&&(a=i),o.updateQuery({_tk:r||n,_camp:a?.toString()||""}),o.toString()}function o(e,a,i,t,s=null){let _=(0,r.I_)(e?.handler);if([r.g2.OPEN_URL_IN_NEW_TAB,r.g2.OPEN_URL_IN_CURRENT_TAB,r.g2.LAUNCH_URL_IN_NEW_TAB].includes(_)&&e&&Array.isArray(e.args)&&e.args)return n(e.args[0],i,t,s,a)}},87855(e,a,i){i.a(e,async function(e,t){try{i.d(a,{Rk:()=>p,WR:()=>v,Zo:()=>l,hR:()=>c,n9:()=>u,oz:()=>g,to:()=>m}),i(82136),i(4992),i(79461);var r=i(83461),n=i(41188),o=i(97373),s=i(50313),_=i(97161),d=e([_]);_=(d.then?(await d)():d)[0];let p="react-modal-root",u="react-modal-root",h=function(e=!0,a){let i=a||p,t=document.getElementById(i);return!t&&e&&((t=document.createElement("div")).id=i,t.setAttribute("data-testid",u),document.body.insertBefore(t,document.body.firstChild||null)),t};function c(e,a=!0,i){let t=h(!0,i);return a&&t&&(n.unmountComponentAtNode(t),Array.from(t.parentNode.children).filter(e=>e!==t&&"accessible-announce"!==e.id&&"react-snackbar-root"!==e.id).forEach(e=>{e.setAttribute("aria-hidden","true")})),n.render(r.createElement(o.Kq,{value:_.YG},e),t)}function l(){return!!h(!1)}function g(e,a){let i=h(!0,a);i&&(n.unmountComponentAtNode(i),(0,s.Mn)(),Array.from(i.parentNode.children).filter(e=>e!==i).forEach(e=>{e.removeAttribute("aria-hidden")}),e&&e.focus&&e.focus())}function m(){let e=h();e&&(e.style.display="")}let v=_.YG.formatMessage({id:"PjwOeo",defaultMessage:"Close"});t()}catch(e){t(e)}})},20645(e,a,i){i.d(a,{BF:()=>_,Se:()=>d,cC:()=>s,lH:()=>l,Cx:()=>c});var t,r,n,o=i(39438),s=((t={}).START="start",t.SUCCESS="success",t.FAILED="failed",t),_=((r={}).CLOSE="close",r.CLOSE_ATTEMPT="close_attempt",r.EXIT_INTENT_OFFER_SHOWN="exit_intent_offer_shown",r.EXIT_INTENT_OFFER_ACCEPTED="exit_intent_offer_accepted",r.EXIT_INTENT_OFFER_DISMISSED="exit_intent_offer_dismissed",r.EXIT_INTENT_OFFER_UNAVAILABLE="exit_intent_offer_unavailable",r.EXIT_INTENT_OFFER_TIMEOUT="exit_intent_offer_timeout",r.PURCHASE_SUCCESS="purchase_success",r.COMPARE_ALL_PLANS="compare_plans",r),d=((n={}).ADMIN_CONSOLE_BILLING_PAGE="admin_console_billing_page",n.ADMIN_CONSOLE_BILLING_PAGE_REDESIGN="admin_console_billing_page_redesign",n.GLIDE_M2_OUT_OF_SPACE_MODAL="glide_m2_out_of_space_modal",n.TEAM_OVERVIEW_MENU_ADD_BILLING_BUTTON="team_overview_menu_add_billing_button",n.PROMPT_CAMPAIGN="prompt_campaign",n.OVERQUOTA_RESTRICTIONS_MODAL="overquota_restrictions_modal",n.TEAM_CREATION_FROM_SHARED_FOLDER="team_creation_from_shared_folder",n.LOCKED_STATE_TEAM_DECISION_MODAL="locked_state_team_decision_modal",n.LOCKED_STATE_TEAM_RESTRICTIONS_PROMPT_MODAL="locked_state_team_restrictions_prompt_modal",n.LOCKED_STATE_TEAM_RESTRICTIONS_MODAL="locked_state_team_restrictions_modal",n.RESTORATION_UPSELL_MODAL="restoration_upsell_modal",n.OVERQUOTA_FILE_DELETION_WARNING_MODAL="overquota_file_deletion_warning_modal",n.OVERQUOTA_DECISION_MODAL="overquota_decision_modal",n.BLOCK_PENDING_OQ_UPLOAD_MODAL="block_pending_oq_upload_modal",n.LOSS_AVERSION_SCREEN="fss_team_trial_end_loss_aversion_screen",n.BASIC_USER_SKU_ROUTING="basic_user_sku_routing",n.QUOTA_USAGE_INDICATOR_PANEL="quota_usage_indicator_panel",n.DASH_CHAT_LIMITED_INGESTION="dash_chat_limited_ingestion",n.SUBACCOUNT_TEAM_CREATION="subaccount_team_creation",n.DEVTOOLS="devtools_testing",n);let c=(e,a,i)=>{let t={class:"portable_checkout",action:"shown",object:"portable_checkout_modal",properties:{eventState:e,actionSurface:a,teamCreationEntryPoint:i}},r={tags:{action_surface:a,teamCreationEntryPoint:i??"none"}};"start"===e?o.X.logStart(t,r):o.X.logEnd(t,{...r,eventState:e})},l=(e,a,i)=>{o.X.logEvent({class:"portable_checkout",action:"select",object:"portable_checkout_modal",properties:{actionElement:e,actionSurface:a,teamCreationEntryPoint:i}},{tags:{action_surface:a,action_element:e,teamCreationEntryPoint:i??"none"}})}}}]);
//# sourceMappingURL=c_js_growth-components_trial-cards_trial-comparison-card_index-metaserver_static_js_campaign-e3b54d.js-vflZjM7nT.map
//# debugId=2e5dc28f-3eea-32d7-b3d2-311611fa2a4d