/** Shared local SVG sprite; icon names are interface constants. */
const sprite=new URL('../../img/icons.svg',import.meta.url).href;
export const icon=(name,extra='')=>`<svg class="icon ${extra}" aria-hidden="true"><use href="${sprite}#${name}"></use></svg>`;
