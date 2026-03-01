const normalizeBreadcrumbs = (breadcrumbs = []) => {
  if (!Array.isArray(breadcrumbs)) return [];
  return breadcrumbs.filter((crumb) => crumb && typeof crumb === 'object');
};

export const generateBreadcrumbStructuredData = (breadcrumbs = []) => {
  const normalized = normalizeBreadcrumbs(breadcrumbs);

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: normalized.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: String(crumb.name ?? ''),
      item: String(crumb.url ?? '')
    }))
  };
};
