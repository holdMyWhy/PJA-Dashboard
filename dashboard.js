// Create a component using React hooks
const PalmJebelAliDashboard = () => {
  // Destructure React hooks
  const { useState, useEffect } = React;
  
  // Destructure Recharts components
  const { 
    BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, ZAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
  } = Recharts;
  
  // State variables
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('All');
  const [configFilter, setConfigFilter] = useState('All');
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'Layout Name', direction: 'ascending' });
  const [propertyTypes, setPropertyTypes] = useState(['All']);
  const [configTypes, setConfigTypes] = useState(['All']);
  
  // Chart data states
  const [sizeComparisonData, setSizeComparisonData] = useState([]);
  const [priceComparisonData, setPriceComparisonData] = useState([]);
  const [scatterPlotData, setScatterPlotData] = useState([]);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Changed from window.fs.readFile to fetch for GitHub Pages
        const response = await fetch('Master  PJA Master 1.csv');
        const csvText = await response.text();
        
        // Parse the CSV text
        const parsedData = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true
        });
        
        // Clean and process the data
        const cleanedData = parsedData.data
          .filter(row => row['Type'] && row['Type'].trim() !== '')
          .map(property => {
            const cleanProperty = { ...property };
            
            // Clean BUA (Built-Up Area)
            if (property['BUA (in sqft)']) {
              const buaValue = property['BUA (in sqft)'].toString().replace(/,/g, '');
              cleanProperty['BUA_Numeric'] = parseFloat(buaValue);
            }
            
            // Clean Plot Size
            if (property['Plot Size (in sqft)']) {
              let plotValue = property['Plot Size (in sqft)'].toString();
              if (plotValue.includes('~')) {
                plotValue = plotValue.replace(/~/g, '').trim();
              }
              if (plotValue.includes('-')) {
                // For ranges, take the average
                const [min, max] = plotValue.split('-').map(v => parseFloat(v.replace(/,/g, '').trim()));
                plotValue = (min + max) / 2;
              } else {
                plotValue = plotValue.replace(/,/g, '');
              }
              cleanProperty['Plot_Numeric'] = parseFloat(plotValue);
            }
            
            // Clean Launch Price
            if (property['Launched Price (in AED)']) {
              const price = property['Launched Price (in AED)'].toString();
              const priceMatch = price.match(/(\d+\.?\d*)M/);
              if (priceMatch) {
                cleanProperty['Launch_Price_M'] = parseFloat(priceMatch[1]);
              } else if (!isNaN(parseFloat(price.replace(/,/g, '')))) {
                cleanProperty['Launch_Price_M'] = parseFloat(price.replace(/,/g, '')) / 1000000;
              }
            }
            
            // Clean BUA PSF
            if (property['BUA PSF (in AED Per sqft)']) {
              const buaPsf = property['BUA PSF (in AED Per sqft)'].toString();
              if (buaPsf.includes('-')) {
                // For ranges, take the average
                const [min, max] = buaPsf.split('-').map(v => parseFloat(v.replace(/,/g, '').trim()));
                cleanProperty['BUA_PSF_Numeric'] = (min + max) / 2;
              } else {
                const psfValue = buaPsf.replace(/[~,]/g, '').replace(/\s+\(avg\)/g, '');
                cleanProperty['BUA_PSF_Numeric'] = parseFloat(psfValue);
              }
            }
            
            // Clean Plot PSF
            if (property['Plot PSF (in AED Per sqft)']) {
              const plotPsf = property['Plot PSF (in AED Per sqft)'].toString();
              if (plotPsf.includes('-')) {
                // For ranges, take the average
                const [min, max] = plotPsf.split('-').map(v => parseFloat(v.replace(/,/g, '').trim()));
                cleanProperty['Plot_PSF_Numeric'] = (min + max) / 2;
              } else {
                const psfValue = plotPsf.replace(/[~,]/g, '').replace(/\s+\(avg\)/g, '');
                cleanProperty['Plot_PSF_Numeric'] = parseFloat(psfValue);
              }
            }
            
            // Extract number of bedrooms from Config
            if (property['Config']) {
              const bedroomMatch = property['Config'].match(/(\d+)/);
              if (bedroomMatch) {
                cleanProperty['Bedrooms'] = parseInt(bedroomMatch[1]);
              }
            }
            
            return cleanProperty;
          });
        
        setProperties(cleanedData);
        setFilteredProperties(cleanedData);
        
        // Extract unique property types and configs
        const types = ['All', ...new Set(cleanedData.map(p => p['Type']))];
        setPropertyTypes(types);
        
        const configs = ['All', ...new Set(cleanedData
          .filter(p => p['Config'])
          .map(p => p['Config'].trim()))];
        setConfigTypes(configs);
        
        // 1. Size comparison by property type
        const sizeByType = {};
        cleanedData.forEach(property => {
          if (property['Type'] && property['BUA_Numeric']) {
            if (!sizeByType[property['Type']]) {
              sizeByType[property['Type']] = {
                buaTotal: 0,
                buaCount: 0,
                plotTotal: 0,
                plotCount: 0
              };
            }
            
            sizeByType[property['Type']].buaTotal += property['BUA_Numeric'];
            sizeByType[property['Type']].buaCount++;
            
            if (property['Plot_Numeric']) {
              sizeByType[property['Type']].plotTotal += property['Plot_Numeric'];
              sizeByType[property['Type']].plotCount++;
            }
          }
        });
        
        const sizeData = Object.keys(sizeByType).map(type => ({
          name: type,
          avgBUA: Math.round(sizeByType[type].buaTotal / sizeByType[type].buaCount),
          avgPlot: sizeByType[type].plotCount > 0 ? 
            Math.round(sizeByType[type].plotTotal / sizeByType[type].plotCount) : 0
        }));
        setSizeComparisonData(sizeData);
        
        // 2. Price comparison by property type
        const priceByType = {};
        cleanedData.forEach(property => {
          if (property['Type'] && property['Launch_Price_M']) {
            if (!priceByType[property['Type']]) {
              priceByType[property['Type']] = {
                total: 0,
                count: 0
              };
            }
            
            priceByType[property['Type']].total += property['Launch_Price_M'];
            priceByType[property['Type']].count++;
          }
        });
        
        const priceData = Object.keys(priceByType).map(type => ({
          name: type,
          price: Math.round(priceByType[type].total / priceByType[type].count * 10) / 10
        }));
        setPriceComparisonData(priceData);
        
        // 3. Scatter plot data (BUA vs Price)
        const scatterData = cleanedData
          .filter(p => p['BUA_Numeric'] && p['Launch_Price_M'])
          .map(p => ({
            name: p['Layout Name'],
            bua: p['BUA_Numeric'],
            price: p['Launch_Price_M'],
            type: p['Type']
          }));
        setScatterPlotData(scatterData);
        
        setLoading(false);
      } catch (error) {
        console.error("Error loading CSV data:", error);
        setError("Failed to load property data");
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Apply filters
  useEffect(() => {
    let result = [...properties];
    
    // Apply property type filter
    if (typeFilter !== 'All') {
      result = result.filter(property => property['Type'] === typeFilter);
    }
    
    // Apply config filter
    if (configFilter !== 'All') {
      result = result.filter(property => property['Config'] === configFilter);
    }
    
    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        // Handle numeric sorting
        if (['BUA_Numeric', 'Plot_Numeric', 'Launch_Price_M', 'BUA_PSF_Numeric', 'Plot_PSF_Numeric'].includes(sortConfig.key)) {
          const aValue = a[sortConfig.key] || 0;
          const bValue = b[sortConfig.key] || 0;
          
          return sortConfig.direction === 'ascending' 
            ? aValue - bValue
            : bValue - aValue;
        } else {
          // Handle string sorting
          const aValue = (a[sortConfig.key] || '').toString();
          const bValue = (b[sortConfig.key] || '').toString();
          
          return sortConfig.direction === 'ascending'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
      });
    }
    
    setFilteredProperties(result);
  }, [properties, typeFilter, configFilter, sortConfig]);
  
  // Handle sorting
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  // Format numbers with commas
  const formatNumber = (num) => {
    if (num === undefined || num === null || isNaN(num)) return '-';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // Loading state
  if (loading) {
    return React.createElement(
      'div',
      { className: "flex items-center justify-center h-screen" },
      React.createElement(
        'div',
        { className: "text-center" },
        React.createElement(
          'div',
          { className: "text-xl font-semibold text-blue-600 mb-4" },
          "Loading Palm Jebel Ali Data..."
        ),
        React.createElement(
          'div',
          { className: "w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" }
        )
      )
    );
  }
  
  // Error state
  if (error) {
    return React.createElement(
      'div',
      { className: "flex items-center justify-center h-screen" },
      React.createElement(
        'div',
        { className: "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md" },
        React.createElement('p', { className: "font-bold" }, "Error"),
        React.createElement('p', null, error)
      )
    );
  }
  
  // Main content
  return React.createElement(
    'div',
    { className: "bg-gray-50 min-h-screen" },
    
    // Main Content
    React.createElement(
      'main',
      { className: "max-w-7xl mx-auto p-4 sm:p-6" },
      
      // Charts Grid
      React.createElement(
        'div',
        { className: "grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8" },
        
        // Average Size by Property Type
        React.createElement(
          'div',
          { className: "bg-white rounded-lg shadow p-4" },
          React.createElement(
            'h3',
            { className: "text-lg font-medium text-gray-900 mb-4" },
            "Avg. Size by Type"
          ),
          React.createElement(
            'div',
            { className: "h-64" },
            React.createElement(
              ResponsiveContainer,
              { width: "100%", height: "100%" },
              React.createElement(
                BarChart,
                { data: sizeComparisonData },
                React.createElement(CartesianGrid, { strokeDasharray: "3 3" }),
                React.createElement(XAxis, { dataKey: "name" }),
                React.createElement(YAxis),
                React.createElement(Tooltip, { 
                  formatter: (value) => [`${formatNumber(value)} sqft`, ''] 
                }),
                React.createElement(Legend),
                React.createElement(Bar, {
                  dataKey: "avgBUA",
                  name: "Avg. BUA (sqft)",
                  fill: "#0088FE"
                }),
                React.createElement(Bar, {
                  dataKey: "avgPlot",
                  name: "Avg. Plot (sqft)",
                  fill: "#00C49F"
                })
              )
            )
          )
        ),
        
        // Average Price by Property Type
        React.createElement(
          'div',
          { className: "bg-white rounded-lg shadow p-4" },
          React.createElement(
            'h3',
            { className: "text-lg font-medium text-gray-900 mb-4" },
            "Avg. Price by Type"
          ),
          React.createElement(
            'div',
            { className: "h-64" },
            React.createElement(
              ResponsiveContainer,
              { width: "100%", height: "100%" },
              React.createElement(
                BarChart,
                { data: priceComparisonData },
                React.createElement(CartesianGrid, { strokeDasharray: "3 3" }),
                React.createElement(XAxis, { dataKey: "name" }),
                React.createElement(YAxis),
                React.createElement(Tooltip, { 
                  formatter: (value) => [`${value}M AED`, ''] 
                }),
                React.createElement(Legend),
                React.createElement(
                  Bar, 
                  {
                    dataKey: "price",
                    name: "Avg. Launch Price (M AED)",
                    fill: "#8884d8"
                  },
                  priceComparisonData.map((entry, index) => 
                    React.createElement(Cell, {
                      key: `cell-${index}`,
                      fill: COLORS[index % COLORS.length]
                    })
                  )
                )
              )
            )
          )
        )
      ),
      
      // BUA vs Price Scatter Plot
      React.createElement(
        'div',
        { className: "bg-white rounded-lg shadow p-4 mb-8" },
        React.createElement(
          'h3',
          { className: "text-lg font-medium text-gray-900 mb-4" },
          "BUA vs Launch Price"
        ),
        React.createElement(
          'div',
          { className: "h-80" },
          React.createElement(
            ResponsiveContainer,
            { width: "100%", height: "100%" },
            React.createElement(
              ScatterChart,
              { margin: { top: 20, right: 20, bottom: 20, left: 20 } },
              React.createElement(CartesianGrid),
              React.createElement(XAxis, {
                type: "number",
                dataKey: "bua",
                name: "Built-Up Area",
                unit: " sqft",
                label: { value: 'Built-Up Area (sqft)', position: 'insideBottomRight', offset: -10 }
              }),
              React.createElement(YAxis, {
                type: "number",
                dataKey: "price",
                name: "Launch Price",
                unit: "M AED",
                label: { value: 'Launch Price (M AED)', angle: -90, position: 'insideLeft' }
              }),
              React.createElement(ZAxis, { range: [100, 100] }),
              React.createElement(Tooltip, {
                cursor: { strokeDasharray: "3 3" },
                formatter: (value, name) => {
                  if (name === 'Built-Up Area') return [`${formatNumber(value)} sqft`, name];
                  if (name === 'Launch Price') return [`${value}M AED`, name];
                  return [value, name];
                }
              }),
              React.createElement(Legend),
              ...scatterPlotData
                .reduce((types, item) => {
                  if (!types.includes(item.type)) types.push(item.type);
                  return types;
                }, [])
                .map((type, index) => 
                  React.createElement(Scatter, {
                    key: type,
                    name: type,
                    data: scatterPlotData.filter(item => item.type === type),
                    fill: COLORS[index % COLORS.length]
                  })
                )
            )
          )
        )
      ),
      
      // Property Size Ranges
      React.createElement(
        'div',
        { className: "bg-white rounded-lg shadow p-4 mb-8" },
        React.createElement(
          'h3',
          { className: "text-lg font-medium text-gray-900 mb-4" },
          "Property Size Ranges"
        ),
        React.createElement(
          'div',
          { className: "h-96" },
          React.createElement(
            ResponsiveContainer,
            { width: "100%", height: "100%" },
            React.createElement(
              BarChart,
              {
                data: filteredProperties
                  .filter(p => p['BUA_Numeric'])
                  .sort((a, b) => a['BUA_Numeric'] - b['BUA_Numeric'])
                  .map(p => ({
                    name: p['Layout Name'].length > 18 
                      ? p['Layout Name'].substring(0, 18) + '...' 
                      : p['Layout Name'],
                    bua: p['BUA_Numeric'],
                    plot: p['Plot_Numeric'] || 0,
                    type: p['Type']
                  })),
                layout: "vertical",
                margin: { top: 5, right: 30, left: 150, bottom: 5 }
              },
              React.createElement(CartesianGrid, { strokeDasharray: "3 3" }),
              React.createElement(XAxis, { type: "number" }),
              React.createElement(YAxis, {
                type: "category",
                dataKey: "name",
                width: 140,
                tick: { fontSize: 11 }
              }),
              React.createElement(Tooltip, {
                formatter: (value, name) => {
                  if (name === 'bua') return [`${formatNumber(value)} sqft`, 'Built-Up Area'];
                  if (name === 'plot') return [`${formatNumber(value)} sqft`, 'Plot Size'];
                  return [value, name];
                }
              }),
              React.createElement(Legend),
              React.createElement(Bar, {
                dataKey: "bua",
                name: "Built-Up Area (sqft)",
                fill: "#0088FE"
              }),
              React.createElement(Bar, {
                dataKey: "plot",
                name: "Plot Size (sqft)",
                fill: "#00C49F"
              })
            )
          )
        )
      ),
      
      // Properties Data Table
      React.createElement(
        'div',
        { className: "bg-white rounded-lg shadow overflow-hidden mb-8" },
        React.createElement(
          'div',
          { className: "overflow-x-auto" },
          React.createElement(
            'table',
            { className: "min-w-full divide-y divide-gray-200" },
            
            // Table Header
            React.createElement(
              'thead',
              { className: "bg-gray-50" },
              React.createElement(
                'tr',
                null,
                // Layout Name
                React.createElement(
                  'th',
                  {
                    scope: "col",
                    className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100",
                    onClick: () => requestSort('Layout Name')
                  },
                  React.createElement(
                    'div',
                    { className: "flex items-center" },
                    "Layout Name",
                    sortConfig.key === 'Layout Name' && 
                      React.createElement(
                        'span',
                        { className: "ml-1" },
                        sortConfig.direction === 'ascending' ? '↑' : '↓'
                      )
                  )
                ),
                
                // Type
                React.createElement(
                  'th',
                  {
                    scope: "col",
                    className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100",
                    onClick: () => requestSort('Type')
                  },
                  React.createElement(
                    'div',
                    { className: "flex items-center" },
                    "Type",
                    sortConfig.key === 'Type' && 
                      React.createElement(
                        'span',
                        { className: "ml-1" },
                        sortConfig.direction === 'ascending' ? '↑' : '↓'
                      )
                  )
                ),
                
                // Config
                React.createElement(
                  'th',
                  {
                    scope: "col",
                    className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100",
                    onClick: () => requestSort('Config')
                  },
                  React.createElement(
                    'div',
                    { className: "flex items-center" },
                    "Config",
                    sortConfig.key === 'Config' && 
                      React.createElement(
                        'span',
                        { className: "ml-1" },
                        sortConfig.direction === 'ascending' ? '↑' : '↓'
                      )
                  )
                ),
                
                // BUA
                React.createElement(
                  'th',
                  {
                    scope: "col",
                    className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100",
                    onClick: () => requestSort('BUA_Numeric')
                  },
                  React.createElement(
                    'div',
                    { className: "flex items-center" },
                    "BUA (sqft)",
                    sortConfig.key === 'BUA_Numeric' && 
                      React.createElement(
                        'span',
                        { className: "ml-1" },
                        sortConfig.direction === 'ascending' ? '↑' : '↓'
                      )
                  )
                ),
                
                // Plot
                React.createElement(
                  'th',
                  {
                    scope: "col",
                    className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100",
                    onClick: () => requestSort('Plot_Numeric')
                  },
                  React.createElement(
                    'div',
                    { className: "flex items-center" },
                    "Plot (sqft)",
                    sortConfig.key === 'Plot_Numeric' && 
                      React.createElement(
                        'span',
                        { className: "ml-1" },
                        sortConfig.direction === 'ascending' ? '↑' : '↓'
                      )
                  )
                ),
                
                // Launch Price
                React.createElement(
                  'th',
                  {
                    scope: "col",
                    className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100",
                    onClick: () => requestSort('Launch_Price_M')
                  },
                  React.createElement(
                    'div',
                    { className: "flex items-center" },
                    "Launch Price",
                    sortConfig.key === 'Launch_Price_M' && 
                      React.createElement(
                        'span',
                        { className: "ml-1" },
                        sortConfig.direction === 'ascending' ? '↑' : '↓'
                      )
                  )
                ),
                
                // BUA PSF
                React.createElement(
                  'th',
                  {
                    scope: "col",
                    className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100",
                    onClick: () => requestSort('BUA_PSF_Numeric')
                  },
                  React.createElement(
                    'div',
                    { className: "flex items-center" },
                    "BUA PSF",
                    sortConfig.key === 'BUA_PSF_Numeric' && 
                      React.createElement(
                        'span',
                        { className: "ml-1" },
                        sortConfig.direction === 'ascending' ? '↑' : '↓'
                      )
                  )
                ),
                
                // Factors
                React.createElement(
                  'th',
                  {
                    scope: "col",
                    className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  },
                  React.createElement(
                    'div',
                    { className: "flex items-center" },
                    "Factors"
                  )
                )
              )
            ),
            
            // Table Body
            React.createElement(
              'tbody',
              { className: "bg-white divide-y divide-gray-200" },
              filteredProperties.map((property, index) => 
                React.createElement(
                  'tr',
                  { 
                    key: index,
                    className: index % 2 === 0 ? 'bg-white' : 'bg-gray-50' 
                  },
                  // Layout Name
                  React.createElement(
                    'td',
                    { className: "px-6 py-4 whitespace-nowrap" },
                    React.createElement(
                      'div',
                      { className: "text-sm font-medium text-blue-600" },
                      property['Layout Name']
                    )
                  ),
                  
                  // Type
                  React.createElement(
                    'td',
                    { className: "px-6 py-4 whitespace-nowrap" },
                    React.createElement(
                      'div',
                      { 
                        className: `text-sm ${
                          property['Type'] === 'Beach Villa' ? 'text-blue-600' : 
                          property['Type'] === 'Coral Villa' ? 'text-red-600' : 
                          property['Type'] === 'Plots' ? 'text-green-600' : 'text-gray-900'
                        }` 
                      },
                      property['Type']
                    )
                  ),
                  
                  // Config
                  React.createElement(
                    'td',
                    { className: "px-6 py-4 whitespace-nowrap" },
                    React.createElement(
                      'div',
                      { className: "text-sm text-gray-900" },
                      property['Config']
                    )
                  ),
                  
                  // BUA
                  React.createElement(
                    'td',
                    { className: "px-6 py-4 whitespace-nowrap" },
                    React.createElement(
                      'div',
                      { className: "text-sm text-gray-900" },
                      formatNumber(property['BUA_Numeric'])
                    )
                  ),
                  
                  // Plot
                  React.createElement(
                    'td',
                    { className: "px-6 py-4 whitespace-nowrap" },
                    React.createElement(
                      'div',
                      { className: "text-sm text-gray-900" },
                      formatNumber(property['Plot_Numeric'])
                    )
                  ),
                  
                  // Launch Price
                  React.createElement(
                    'td',
                    { className: "px-6 py-4 whitespace-nowrap" },
                    React.createElement(
                      'div',
                      { className: "text-sm text-gray-900" },
                      property['Launched Price (in AED)']
                    )
                  ),
                  
                  // BUA PSF
                  React.createElement(
                    'td',
                    { className: "px-6 py-4 whitespace-nowrap" },
                    React.createElement(
                      'div',
                      { className: "text-sm text-gray-900" },
                      property['BUA PSF (in AED Per sqft)']
                    )
                  ),
                  
                  // Factors
                  React.createElement(
                    'td',
                    { className: "px-6 py-4 whitespace-nowrap" },
                    React.createElement(
                      'div',
                      { className: "text-sm text-gray-900" },
                      property['Factors']
                    )
                  )
                )
              )
            )
          )
        )
      )
    ),
    
    // Footer
    React.createElement(
      'footer',
      { className: "bg-white border-t border-gray-200 py-4" },
      React.createElement(
        'div',
        { className: "max-w-7xl mx-auto px-4 text-center" },
        React.createElement(
          'p',
          { className: "text-sm text-gray-500" },
          "Palm Jebel Ali Property Data • March 2025"
        )
      )
    )
  );
};
