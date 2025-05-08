import React, { useState } from 'react';
import Table from 'react-bootstrap/Table';
import Image from 'react-bootstrap/Image';
import Form from 'react-bootstrap/Form';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { RiDeleteBin5Fill, RiEdit2Fill } from 'react-icons/ri';
import { LuSearch } from 'react-icons/lu';

const initialData = [
  {
    id: 1,
    name: 'Chair Comfort',
    image: '/Images/admin.jpg',
    subtitle: 'Limitless time',
    type: 'Search',
    category: 'Product',
    modal: 'Without limit',
    viewed: { value: 2000, change: -80 },
    clicked: { value: 88, change: -80 },
    clickPresent: { value: 4.45, change: 4.1 },
    cost: { value: 10, change: 8 },
    sale: { value: 540, change: 60 }
  },
  {
    id: 2,
    name: 'Chair Labelis',
    image: '/Images/user.jpg',
    subtitle: 'Limitless time',
    type: 'Search',
    category: 'Product',
    modal: 'Without limit',
    viewed: { value: 170, change: 70 },
    clicked: { value: 180, change: 20 },
    clickPresent: { value: 4.45, change: 6.1 },
    cost: { value: 15, change: -80 },
    sale: { value: 80, change: -80 }
  },
  {
    id: 3,
    name: 'Chair Pro',
    image: '/Images/admin.jpg',
    subtitle: 'Comfort design',
    type: 'Search',
    category: 'Product',
    modal: 'Without limit',
    viewed: { value: 2200, change: 50 },
    clicked: { value: 90, change: 10 },
    clickPresent: { value: 5.45, change: 1.1 },
    cost: { value: 12, change: 5 },
    sale: { value: 430, change: -30 }
  },
  {
    id: 4,
    name: 'Chair Labelis Plus',
    image: '/Images/user.jpg',
    subtitle: 'Ergonomic',
    type: 'Search',
    category: 'Product',
    modal: 'Without limit',
    viewed: { value: 190, change: 10 },
    clicked: { value: 160, change: -10 },
    clickPresent: { value: 4.65, change: 0.2 },
    cost: { value: 14, change: -5 },
    sale: { value: 90, change: 10 }
  }
];

const getColor = (change) => {
  if (change > 0) return 'text-success';
  if (change < 0) return 'text-danger';
  return '';
};

function AssessmentTable() {
  const [data, setData] = useState(initialData);
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }

    const sorted = [...data].sort((a, b) => {
      const aVal = a[key]?.value || '';
      const bVal = b[key]?.value || '';
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    setSortConfig({ key, direction });
    setData(sorted);
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="ms-1" />;
    if (sortConfig.direction === 'asc') return <FaSortUp className="ms-1" />;
    return <FaSortDown className="ms-1" />;
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === data.length) {
      setSelectedIds([]); // Deselect all
    } else {
      setSelectedIds(data.map((item) => item.id)); // Select all
    }
  };

  const filteredData = data.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="AssmentTableDiv">

      <div className="AssmnetLabel">
        <div className="leftAssment">
          <h4>Assessment Listing</h4>
        </div>
        <div className="RytAssment">
          <div className="tblesearch">
            <input
              id="searchbarinput"
              type="text"
              name="search"
              placeholder="Type something"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <LuSearch />
          </div>
          <div className="tbleCheck">
            <input
              type="checkbox"
              checked={selectedIds.length === data.length}
              onChange={toggleSelectAll}
            />
            <p>{selectedIds.length} Selected</p>
          </div>
        </div>
      </div>

      <Table responsive hover className='AssmtTable'>
        <thead>
          <tr>
            <th>
              <Form.Check
                checked={selectedIds.length === data.length}
                onChange={toggleSelectAll}
              />
            </th>
            <th>Product</th>
            <th>Type</th>
            <th>Modal</th>
            <th onClick={() => handleSort('viewed')} style={{ cursor: 'pointer' }}>
              Viewed {renderSortIcon('viewed')}
            </th>
            <th onClick={() => handleSort('clicked')} style={{ cursor: 'pointer' }}>
              Clicked {renderSortIcon('clicked')}
            </th>
            <th onClick={() => handleSort('clickPresent')} style={{ cursor: 'pointer' }}>
              Click Present {renderSortIcon('clickPresent')}
            </th>
            <th onClick={() => handleSort('cost')} style={{ cursor: 'pointer' }}>
              Cost {renderSortIcon('cost')}
            </th>
            <th onClick={() => handleSort('sale')} style={{ cursor: 'pointer' }}>
              Sale {renderSortIcon('sale')}
            </th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map((item) => (
            <tr key={item.id} >
              <td>
                <Form.Check
                  checked={selectedIds.includes(item.id)}
                  onChange={() => toggleSelect(item.id)}
                />
              </td>
              <td>
                <div className="d-flex align-items-center">
                  <Image
                    src={item.image}
                    roundedCircle
                    width={40}
                    height={40}
                    className="me-2"
                  />
                  <div>
                    <div>{item.name}</div>
                    <small className="text-muted">{item.subtitle}</small>
                  </div>
                </div>
              </td>
              <td>
                <div>{item.type}</div>
                <small className="text-muted">{item.category}</small>
              </td>
              <td>{item.modal}</td>
              <td>
                {item.viewed.value}
                <div className={getColor(item.viewed.change)}>
                  {item.viewed.change > 0
                    ? `+${item.viewed.change}%`
                    : `${item.viewed.change}%`}
                </div>
              </td>
              <td>
                {item.clicked.value}
                <div className={getColor(item.clicked.change)}>
                  {item.clicked.change > 0
                    ? `+${item.clicked.change}%`
                    : `${item.clicked.change}%`}
                </div>
              </td>
              <td>
                {item.clickPresent.value}%
                <div className={getColor(item.clickPresent.change)}>
                  {item.clickPresent.change > 0
                    ? `+${item.clickPresent.change}%`
                    : `${item.clickPresent.change}%`}
                </div>
              </td>
              <td>
                ${item.cost.value}
                <div className={getColor(item.cost.change)}>
                  {item.cost.change > 0
                    ? `+${item.cost.change}%`
                    : `${item.cost.change}%`}
                </div>
              </td>
              <td>
                ${item.sale.value}
                <div className={getColor(item.sale.change)}>
                  {item.sale.change > 0
                    ? `+${item.sale.change}%`
                    : `${item.sale.change}%`}
                </div>
              </td>
              <td className="Action">
                <OverlayTrigger
                  placement="bottom"
                  delay={{ show: 250, hide: 400 }}
                  overlay={<Tooltip id="button-tooltip">Edit</Tooltip>}
                >
                  <Button variant="success">
                    <RiEdit2Fill />
                  </Button>
                </OverlayTrigger>
                <OverlayTrigger
                  placement="bottom"
                  delay={{ show: 250, hide: 400 }}
                  overlay={<Tooltip id="button-tooltip">Delete</Tooltip>}
                >
                  <Button variant="success">
                    <RiDeleteBin5Fill />
                  </Button>
                </OverlayTrigger>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

export default AssessmentTable;
