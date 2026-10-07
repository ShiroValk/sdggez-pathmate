import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <>
      <main className="p-6"><h1>找不到頁面</h1><Link to="/">返回首頁</Link></main>
    </>
  );
};

export default NotFound;
