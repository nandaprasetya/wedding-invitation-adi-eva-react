import EditorialClassic from './editorial-classic/EditorialClassic';

export const TEMPLATE_COMPONENTS = {
  'editorial-classic': EditorialClassic,
};

export function getTemplateComponent(templateId) {
  return TEMPLATE_COMPONENTS[templateId] || EditorialClassic;
}
